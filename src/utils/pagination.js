import { uniformTemplate, templateCapacity } from '../document/pageTemplate'

/**
 * Répartition des lignes de données en pages.
 *
 * Fonction pure, sans React : c'est le cœur métier du catalogue (combien de
 * pages, quelles vignettes sur chacune) et il est testé à ce titre.
 * Le hook `usePagination` n'en est qu'un enrobage mémoïsé.
 *
 * La capacité d'une page n'est plus fixe : elle vient du GABARIT retenu pour
 * la catégorie en cours. Une page « chocolats » peut ainsi recevoir trois
 * grandes vignettes puis six petites, pendant que « bonbons » garde une
 * grille uniforme. Sans gabarit fourni, on retombe sur la grille du projet,
 * ce qui laisse les catalogues existants inchangés.
 *
 * Renvoie un tableau de pages :
 *   { index, groupKey, groupLabel, rows, isFirstOfGroup, isLastOfGroup, template }
 *
 * Sans `groupColumn`, les lignes se suivent sans rupture. Avec, chaque valeur
 * distincte de la colonne démarre une nouvelle page.
 *
 * @param {object[]} rawData
 * @param {object} grid
 * @param {string|null} groupColumn
 * @param {object} [options]
 * @param {(groupKey: string|null) => object} [options.templateFor] gabarit d'un groupe
 */
export function paginate(rawData, grid, groupColumn, { templateFor, breakBefore } = {}) {
  if (!rawData || rawData.length === 0) return []

  const parDefaut = uniformTemplate(grid)
  const gabaritDe = (cle) => templateFor?.(cle) ?? parDefaut

  if (!groupColumn) {
    return decouper(rawData, gabaritDe(null), { key: null, label: null }, breakBefore)
  }

  // Les lignes sont regroupées dans leur ordre d'arrivée : deux blocs séparés
  // partageant la même valeur donnent deux groupes, ce qui respecte le tri du
  // fichier source plutôt que de le réorganiser dans le dos de l'utilisateur.
  const groups = []
  let currentGroup = null

  for (const row of rawData) {
    const key = String(row[groupColumn] ?? '')
    if (!currentGroup || currentGroup.key !== key) {
      currentGroup = { key, label: key, rows: [] }
      groups.push(currentGroup)
    }
    currentGroup.rows.push(row)
  }

  const pages = []
  for (const group of groups) {
    pages.push(...decouper(group.rows, gabaritDe(group.key), group, breakBefore))
  }

  // La numérotation est continue sur tout le document, pas par groupe.
  return pages.map((p, index) => ({ ...p, index }))
}

/**
 * Découpe les lignes d'un groupe selon la capacité de son gabarit, en
 * respectant les sauts de page forcés.
 *
 * `breakBefore(row)` répond « cette ligne doit ouvrir une page ». C'est le
 * moyen de contrôle donné à l'utilisateur : plutôt que de deviner comment une
 * retouche doit suivre les produits, il décide lui-même où couper. Le saut est
 * attaché au produit, pas à un numéro de page — il survit donc à l'ajout de
 * produits avant lui.
 */
function decouper(rows, template, group, breakBefore) {
  const parPage = templateCapacity(template)
  // Un gabarit sans emplacement ne peut rien recevoir : mieux vaut aucune page
  // qu'une boucle infinie.
  if (parPage < 1) return []

  const paquets = []
  let courant = []

  for (const row of rows) {
    const pageEstPleine = courant.length >= parPage
    const sautDemande = courant.length > 0 && Boolean(breakBefore?.(row))
    if (pageEstPleine || sautDemande) {
      paquets.push(courant)
      courant = []
    }
    courant.push(row)
  }
  if (courant.length > 0) paquets.push(courant)

  return paquets.map((lignes, i) => ({
    index: i,
    groupKey: group.key,
    groupLabel: group.label,
    rows: lignes,
    isFirstOfGroup: group.key != null && i === 0,
    isLastOfGroup: group.key != null && i === paquets.length - 1,
    template,
  }))
}
