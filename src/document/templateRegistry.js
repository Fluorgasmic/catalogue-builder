/**
 * Résolution des gabarits de page.
 *
 * Deux origines : les dispositions livrées avec l'application, et celles que
 * l'utilisateur compose lui-même. Les secondes l'emportent sur les premières
 * à identifiant égal, ce qui permet d'ajuster une disposition fournie sans
 * avoir à la renommer.
 *
 * Un identifiant absent ou inconnu ne renvoie rien : l'appelant retombe alors
 * sur la grille uniforme du projet, ce qui garde un catalogue affichable même
 * après suppression d'un gabarit encore affecté à une catégorie.
 */

import { TEMPLATE_PRESETS } from './pageTemplate'

/** Tous les gabarits disponibles, personnels d'abord. */
export function allTemplates(custom = []) {
  const perso = custom ?? []
  const idsPerso = new Set(perso.map((t) => t.id))
  return [...perso, ...TEMPLATE_PRESETS.filter((t) => !idsPerso.has(t.id))]
}

/** Gabarit par son identifiant, ou null. */
export function findTemplate(id, custom = []) {
  if (!id) return null
  return allTemplates(custom).find((t) => t.id === id) ?? null
}

/**
 * Fabrique le résolveur attendu par `paginate` : quel gabarit pour quelle
 * catégorie, avec repli sur le gabarit par défaut du projet.
 */
export function templateResolver({ templateByGroup = {}, defaultTemplateId = null, custom = [] } = {}) {
  return (groupKey) => {
    const id = (groupKey != null ? templateByGroup[groupKey] : null) ?? defaultTemplateId
    return findTemplate(id, custom) ?? undefined
  }
}

/** Valeurs distinctes d'une colonne, dans leur ordre d'apparition. */
export function distinctGroupValues(rawData = [], groupColumn) {
  if (!groupColumn) return []
  const vues = new Set()
  const valeurs = []
  for (const row of rawData) {
    const v = String(row?.[groupColumn] ?? '')
    if (!vues.has(v)) { vues.add(v); valeurs.push(v) }
  }
  return valeurs
}
