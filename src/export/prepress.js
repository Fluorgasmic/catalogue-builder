/**
 * Géométrie de prépresse : fond perdu, traits de coupe, repères de repérage.
 *
 * Vocabulaire, parce que les trois se confondent facilement :
 *
 *  · le FORMAT FINI (trim) est ce que le lecteur tient en main après massicot ;
 *  · le FOND PERDU (bleed) est la marge de débord tout autour, dans laquelle
 *    les aplats se prolongent : sans elle, le moindre décalage de coupe laisse
 *    un liseré blanc au bord de la page ;
 *  · les TRAITS DE COUPE indiquent au massicot où couper. Ils se placent en
 *    dehors du fond perdu, sinon ils s'impriment sur la page finie ;
 *  · les REPÈRES DE REPÉRAGE servent à caler les plaques d'encre entre elles.
 *
 * Le support (media) est donc plus grand que le format fini : il l'englobe
 * avec son fond perdu, plus la place des traits.
 *
 * Toutes les valeurs sont en millimètres, origine en haut à gauche du support.
 */

/** Longueur d'un trait de coupe. 5 mm est la convention des imprimeurs. */
export const LONGUEUR_TRAIT_MM = 5

/** Écart entre le format fini et le début des traits, en plus du fond perdu. */
export const ECART_TRAIT_MM = 1

/** Rayon d'un repère de repérage. */
export const RAYON_REPERE_MM = 2.5

/** Épaisseur des traits de prépresse — 0,25 pt, standard. */
export const EPAISSEUR_TRAIT_MM = 0.088

/**
 * Dimensions du support et décalage à appliquer au contenu.
 *
 * @param {object} p
 * @param {number} p.trimW    largeur du format fini
 * @param {number} p.trimH    hauteur du format fini
 * @param {number} [p.bleed]  fond perdu
 * @param {boolean} [p.marks] réserver la place des traits et repères
 */
export function prepressGeometry({ trimW, trimH, bleed = 0, marks = false }) {
  const fondPerdu = Math.max(0, bleed)
  // Les traits vivent au-delà du fond perdu : il leur faut leur propre marge.
  const margeTraits = marks ? ECART_TRAIT_MM + LONGUEUR_TRAIT_MM : 0
  const marge = fondPerdu + margeTraits

  return {
    bleed: fondPerdu,
    mediaW: trimW + marge * 2,
    mediaH: trimH + marge * 2,
    // Décalage du contenu : le format fini est centré dans le support.
    offsetX: marge,
    offsetY: marge,
    trimBox: { x: marge, y: marge, w: trimW, h: trimH },
    bleedBox: {
      x: marge - fondPerdu, y: marge - fondPerdu,
      w: trimW + fondPerdu * 2, h: trimH + fondPerdu * 2,
    },
  }
}

/**
 * Traits de coupe : deux segments par coin, alignés sur les bords du format
 * fini et prolongés vers l'extérieur, sans jamais entrer dans le fond perdu.
 */
export function cropMarks(geo, { trimW, trimH }) {
  const { offsetX: ox, offsetY: oy, bleed } = geo
  const debut = bleed + ECART_TRAIT_MM
  const fin = debut + LONGUEUR_TRAIT_MM
  const e = EPAISSEUR_TRAIT_MM
  const traits = []

  // Pour chaque coin : un segment horizontal et un segment vertical, chacun
  // pointant vers l'extérieur depuis le bord du format fini.
  const coins = [
    { x: ox,          y: oy,          sx: -1, sy: -1 }, // haut gauche
    { x: ox + trimW,  y: oy,          sx: +1, sy: -1 }, // haut droit
    { x: ox,          y: oy + trimH,  sx: -1, sy: +1 }, // bas gauche
    { x: ox + trimW,  y: oy + trimH,  sx: +1, sy: +1 }, // bas droit
  ]

  for (const c of coins) {
    // Segment horizontal, prolongeant le bord haut ou bas
    traits.push({
      kind: 'rect',
      x: c.sx < 0 ? c.x - fin : c.x + debut,
      y: c.y - e / 2,
      w: LONGUEUR_TRAIT_MM, h: e, fill: '#000000',
    })
    // Segment vertical, prolongeant le bord gauche ou droit
    traits.push({
      kind: 'rect',
      x: c.x - e / 2,
      y: c.sy < 0 ? c.y - fin : c.y + debut,
      w: e, h: LONGUEUR_TRAIT_MM, fill: '#000000',
    })
  }

  return traits
}

/**
 * Repères de repérage : une cible (cercle + croix) centrée sur chaque bord,
 * dans la marge des traits.
 */
export function registrationMarks(geo, { trimW, trimH }) {
  const { offsetX: ox, offsetY: oy, bleed } = geo
  const r = RAYON_REPERE_MM
  const e = EPAISSEUR_TRAIT_MM
  const distance = bleed + ECART_TRAIT_MM + LONGUEUR_TRAIT_MM / 2

  const centres = [
    { x: ox + trimW / 2, y: oy - distance },          // haut
    { x: ox + trimW / 2, y: oy + trimH + distance },  // bas
    { x: ox - distance,  y: oy + trimH / 2 },         // gauche
    { x: ox + trimW + distance, y: oy + trimH / 2 },  // droite
  ]

  const marques = []
  for (const c of centres) {
    marques.push({ kind: 'circle', x: c.x, y: c.y, r, thickness: e, stroke: '#000000' })
    // Croix débordant légèrement du cercle, comme le veut l'usage
    marques.push({ kind: 'rect', x: c.x - r * 1.4, y: c.y - e / 2, w: r * 2.8, h: e, fill: '#000000' })
    marques.push({ kind: 'rect', x: c.x - e / 2, y: c.y - r * 1.4, w: e, h: r * 2.8, fill: '#000000' })
  }
  return marques
}

/** Ensemble des marques demandées, prêtes à dessiner. */
export function prepressMarks(geo, trim, { cropMarks: coupe = false, registration = false } = {}) {
  const marques = []
  if (coupe) marques.push(...cropMarks(geo, trim))
  if (registration) marques.push(...registrationMarks(geo, trim))
  return marques
}
