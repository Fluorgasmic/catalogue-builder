/**
 * Mesure de texte avec les métriques réelles d'une police.
 *
 * Unités — la convention du projet, à respecter partout :
 *   `block.fontSize` est en PIXELS CSS à 96 dpi. Les deux moteurs de rendu
 *   (éditeur de vignette et aperçu page) multiplient par un facteur
 *   « px affichés / px naturels », ce qui revient au même. Un fontSize de 10
 *   vaut donc 10/96 pouce, soit 2,65 mm, soit 7,5 points typographiques.
 *
 * On mesure via un canvas hors écran : c'est le même moteur de texte que celui
 * qui dessine la page, donc les largeurs correspondent au rendu à l'écran.
 */

export const PX_PER_INCH = 96
export const MM_PER_INCH = 25.4
export const PT_PER_INCH = 72

/** Pixels CSS → millimètres. */
export const pxToMm = (px) => (px / PX_PER_INCH) * MM_PER_INCH

/** Millimètres → pixels CSS. */
export const mmToPx = (mm) => (mm / MM_PER_INCH) * PX_PER_INCH

/** Pixels CSS → points typographiques (unité du PDF). */
export const pxToPt = (px) => (px / PX_PER_INCH) * PT_PER_INCH

let contexte = null

function getContexte() {
  if (contexte) return contexte
  if (typeof document === 'undefined') return null
  contexte = document.createElement('canvas').getContext('2d')
  return contexte
}

/** Chaîne `font` CSS, dans l'ordre qu'attend le canvas. */
export function cssFont({ fontSize, fontFamily, fontWeight, italic }) {
  const style = italic ? 'italic ' : ''
  const poids = fontWeight ?? 400
  const famille = !fontFamily || fontFamily === 'inherit'
    ? 'system-ui, sans-serif'
    : `'${fontFamily}', sans-serif`
  return `${style}${poids} ${fontSize}px ${famille}`
}

/**
 * Fabrique une fonction de mesure pour un style donné.
 * Renvoie des largeurs en pixels CSS, comme `fontSize`.
 *
 * Hors navigateur (tests unitaires du moteur), retombe sur une approximation
 * proportionnelle : les tests de découpage injectent de toute façon leur
 * propre mesure, celle-ci ne sert qu'à ne jamais lever d'exception.
 */
export function createMeasurer(style) {
  const ctx = getContexte()
  if (!ctx) {
    const approx = style.fontSize * 0.5
    return (texte) => String(texte ?? '').length * approx
  }
  ctx.font = cssFont(style)
  return (texte) => ctx.measureText(String(texte ?? '')).width
}
