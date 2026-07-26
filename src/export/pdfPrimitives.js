/**
 * Conversions et calculs du rendu PDF, isolés du dessin lui-même pour rester
 * testables sans produire de fichier.
 *
 * Deux différences de repère entre l'écran et le PDF, sources classiques
 * d'erreurs d'un demi-millimètre à l'impression :
 *
 *  · l'origine — l'écran compte vers le bas depuis le coin haut gauche,
 *    le PDF vers le haut depuis le coin bas gauche ;
 *  · le texte — le navigateur positionne une boîte de ligne, le PDF pose une
 *    ligne de base. Il faut donc descendre du demi-interligne puis de la
 *    hauteur d'ascendante, exactement comme le modèle CSS du « half-leading ».
 */

export const PT_PER_MM = 72 / 25.4

/**
 * Arrondit un nombre avant de le confier au PDF.
 *
 * Les mesures issues d'un canvas produisent des flottants à dix-sept décimales
 * (51.890136718750001…). Écrits tels quels, ils allongent le flux de contenu
 * au-delà de la place réservée et corrompent les opérateurs voisins : on a vu
 * une composante de couleur se souder à la sélection de police, rendant le
 * texte invisible dans le PDF alors qu'il figurait bien dans le fichier.
 *
 * Quatre décimales de point valent un dix-millième de millimètre : très en
 * deçà de ce qu'une presse peut restituer, et sans risque pour la sortie.
 */
export function arrondir(valeur, decimales = 4) {
  if (!Number.isFinite(valeur)) return 0
  const f = 10 ** decimales
  return Math.round(valeur * f) / f
}

/** Millimètres → points typographiques, à précision maîtrisée. */
export const mmToPt = (mm) => arrondir(mm * PT_PER_MM)

/** Ordonnée PDF (origine en bas) d'un objet posé à `yMm` du haut. */
export function flipY(yMm, heightMm, pageHeightMm) {
  return mmToPt(pageHeightMm - yMm - heightMm)
}

/**
 * Ligne de base d'un texte, en points depuis le bas de la page.
 *
 * @param yMm          haut de la boîte de ligne, depuis le haut de la page
 * @param lineHeightMm hauteur de la boîte de ligne
 * @param sizeMm       taille de police
 * @param metrics      { ascent, descent, unitsPerEm } de la police
 * @param pageHeightMm hauteur de page
 */
export function baselineY(yMm, lineHeightMm, sizeMm, metrics, pageHeightMm) {
  const { ascent, descent, unitsPerEm } = metrics
  const ratioAsc = ascent / unitsPerEm
  const ratioDesc = Math.abs(descent) / unitsPerEm

  // Modèle CSS : la boîte de contenu (ascendante + descendante) est centrée
  // dans la boîte de ligne, le reste se répartit en demi-interlignes.
  const hauteurContenu = (ratioAsc + ratioDesc) * sizeMm
  const demiInterligne = (lineHeightMm - hauteurContenu) / 2
  const baseDepuisHaut = yMm + demiInterligne + ratioAsc * sizeMm

  return mmToPt(pageHeightMm - baseDepuisHaut)
}

/**
 * Abscisse de départ selon l'alignement.
 * `textWidthMm` est la largeur mesurée du texte dans sa police.
 */
export function alignedX(xMm, boxWidthMm, textWidthMm, align) {
  if (align === 'center') return mmToPt(xMm + (boxWidthMm - textWidthMm) / 2)
  if (align === 'right') return mmToPt(xMm + boxWidthMm - textWidthMm)
  return mmToPt(xMm)
}

/** `#rrggbb` ou `#rgb` → composantes 0–1, ou null si non interprétable. */
export function parseColor(couleur) {
  if (typeof couleur !== 'string') return null
  let hex = couleur.trim().replace(/^#/, '')
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null
  // Arrondi indispensable : 99/255 s'écrit sur dix-sept décimales et déborde
  // de la place que le PDF réserve à l'opérateur de couleur.
  return {
    r: arrondir(parseInt(hex.slice(0, 2), 16) / 255, 5),
    g: arrondir(parseInt(hex.slice(2, 4), 16) / 255, 5),
    b: arrondir(parseInt(hex.slice(4, 6), 16) / 255, 5),
  }
}

/**
 * Rectangle d'une image selon son mode d'ajustement, dans sa boîte.
 * `contain` conserve les proportions sans déborder, `cover` remplit quitte à
 * rogner, `fill` étire. Renvoie des millimètres, origine en haut à gauche.
 */
export function fitImage({ boxW, boxH, naturalW, naturalH, fit = 'contain' }) {
  if (!naturalW || !naturalH || fit === 'fill') {
    return { x: 0, y: 0, w: arrondir(boxW), h: arrondir(boxH) }
  }
  const ratioBoite = boxW / boxH
  const ratioImage = naturalW / naturalH
  const remplir = fit === 'cover'
  const plusLarge = ratioImage > ratioBoite

  const suivreLargeur = remplir ? !plusLarge : plusLarge
  const w = suivreLargeur ? boxW : boxH * ratioImage
  const h = suivreLargeur ? boxW / ratioImage : boxH

  return { x: arrondir((boxW - w) / 2), y: arrondir((boxH - h) / 2), w: arrondir(w), h: arrondir(h) }
}
