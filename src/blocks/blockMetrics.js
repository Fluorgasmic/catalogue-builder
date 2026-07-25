/**
 * Géométrie des blocs de vignette — source unique de vérité.
 *
 * Ces formules étaient écrites deux fois : dans blockRenderer (qui pose le CSS)
 * et dans VignettePlaceholder (qui estime la hauteur pour savoir quels blocs
 * tiennent dans la vignette). Les deux devaient rester identiques au pixel près
 * sans rien pour le garantir. Elles vivent désormais ici, et sont testées.
 *
 * Toutes les fonctions sont pures et renvoient des pixels ; `scale` convertit
 * les millimètres du modèle en pixels d'affichage ou d'export.
 */

/** Interligne des blocs de texte, en multiple de la taille de police. */
export const LINE_HEIGHT = 1.4

/**
 * Mesures d'un bloc de texte (lié ou statique).
 * `blockH` est la hauteur qu'il occupe dans le flux vertical.
 */
export function textMetrics(block, scale) {
  const fontSize = (block.fontSize ?? 10) * scale
  const maxLines = block.maxLines ?? 1
  const paddingVpx = Math.round((block.paddingV ?? 2) * scale)
  const paddingHpx = Math.round((block.paddingH ?? 3) * scale)
  // Arrondi à l'entier : évite que les sous-pixels s'accumulent d'un bloc à
  // l'autre et fassent diverger l'estimation du rendu CSS réel.
  const textH = Math.ceil(fontSize * LINE_HEIGHT * maxLines)

  return { fontSize, maxLines, paddingVpx, paddingHpx, textH, blockH: textH + paddingVpx * 2 }
}

/**
 * Hauteur d'un bloc image : toujours un pourcentage de la hauteur de vignette,
 * jamais une valeur absolue — ainsi il s'adapte à n'importe quelle grille.
 */
export function imageHeight(block, vignetteHpx) {
  const pct = block.heightPct != null ? block.heightPct / 100 : 0.5
  return pct * vignetteHpx
}

/** Mesures d'un séparateur : le trait, plus ses marges au-dessus et en dessous. */
export function separatorMetrics(block, scale) {
  const marginV = (block.marginV ?? 2) * scale
  const lineH = Math.max(0.5, (block.thickness ?? 0.5) * scale)
  return { marginV, lineH, blockH: lineH + marginV * 2 }
}

/**
 * Hauteur occupée dans le flux vertical de la vignette.
 * Les blocs positionnés librement (badges) flottent au-dessus et ne consomment
 * aucune hauteur : ils renvoient 0.
 */
export function flowBlockHeight(block, vignetteHpx, scale) {
  switch (block.type) {
    case 'text':
    case 'static':
      return textMetrics(block, scale).blockH
    case 'image':
      return imageHeight(block, vignetteHpx)
    case 'separator':
      return separatorMetrics(block, scale).blockH
    default:
      return 0
  }
}
