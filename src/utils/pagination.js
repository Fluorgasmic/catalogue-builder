/**
 * Répartition des lignes de données en pages.
 *
 * Fonction pure, sans React : c'est le cœur métier du catalogue (combien de
 * pages, quelles vignettes sur chacune) et il est testé à ce titre.
 * Le hook `usePagination` n'en est qu'un enrobage mémoïsé.
 *
 * Renvoie un tableau de pages :
 *   { index, groupKey, groupLabel, rows, isFirstOfGroup, isLastOfGroup }
 *
 * Sans `groupColumn`, les lignes se suivent sans rupture. Avec, chaque valeur
 * distincte de la colonne démarre une nouvelle page.
 */
export function paginate(rawData, grid, groupColumn) {
  if (!rawData || rawData.length === 0) return []

  const perPage = grid.columns * grid.rows
  if (perPage < 1) return []

  if (!groupColumn) {
    const pages = []
    for (let i = 0; i < rawData.length; i += perPage) {
      pages.push({
        index: pages.length,
        groupKey: null,
        groupLabel: null,
        rows: rawData.slice(i, i + perPage),
        isFirstOfGroup: false,
        isLastOfGroup: false,
      })
    }
    return pages
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
    const groupRows = group.rows
    let first = true
    for (let i = 0; i < groupRows.length; i += perPage) {
      pages.push({
        index: pages.length,
        groupKey: group.key,
        groupLabel: group.label,
        rows: groupRows.slice(i, i + perPage),
        isFirstOfGroup: first,
        isLastOfGroup: i + perPage >= groupRows.length,
      })
      first = false
    }
  }

  return pages
}
