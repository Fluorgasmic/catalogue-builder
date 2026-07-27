/**
 * Gabarits de page : la mise en page cesse d'être une grille unique.
 *
 * Un gabarit découpe la zone de contenu en BANDES horizontales, chacune
 * portant sa propre sous-grille. « Trois grandes vignettes en haut, six
 * petites en bas » s'écrit donc en deux bandes : 3×1 sur la moitié haute,
 * 3×2 sur la moitié basse.
 *
 * Le découpage est décrit en pourcentages de hauteur, jamais en millimètres :
 * un gabarit reste ainsi valable quel que soit le format de page, et suit
 * l'A4 comme l'A3 sans être réécrit.
 *
 * Les emplacements produits sont en millimètres, dans l'ordre de lecture :
 * de gauche à droite, puis de haut en bas — c'est l'ordre dans lequel les
 * produits du fichier viendront s'y ranger.
 */

/** Gabarit par défaut : la grille uniforme d'aujourd'hui, en une seule bande. */
export function uniformTemplate(grid) {
  return {
    id: 'uniforme',
    name: 'Grille uniforme',
    bands: [{
      heightPct: 100,
      columns: grid?.columns ?? 2,
      rows: grid?.rows ?? 3,
    }],
  }
}

/** Nombre de vignettes qu'un gabarit peut recevoir. */
export function templateCapacity(template) {
  return (template?.bands ?? []).reduce(
    (total, b) => total + Math.max(0, b.columns ?? 0) * Math.max(0, b.rows ?? 0),
    0,
  )
}

/**
 * Normalise les hauteurs de bandes pour qu'elles totalisent 100 %.
 *
 * Un gabarit saisi à la main totalise rarement juste ; plutôt que de refuser
 * ou de laisser un trou en bas de page, on répartit proportionnellement.
 */
export function normalizeBands(bands = []) {
  const valides = bands.filter((b) => (b.heightPct ?? 0) > 0)
  const total = valides.reduce((t, b) => t + b.heightPct, 0)
  if (valides.length === 0) return []
  if (total === 0) {
    const part = 100 / valides.length
    return valides.map((b) => ({ ...b, heightPct: part }))
  }
  return valides.map((b) => ({ ...b, heightPct: (b.heightPct / total) * 100 }))
}

/**
 * Emplacements de vignettes d'un gabarit, en millimètres.
 *
 * @param {object} template
 * @param {object} zone      zone de contenu { x, y, w, h } en mm
 * @param {object} [grid]    gouttières par défaut, reprises si la bande n'en
 *                           définit pas
 * @returns {{x,y,w,h}[]} emplacements, dans l'ordre de lecture
 */
export function templateSlots(template, zone, grid = {}) {
  const bandes = normalizeBands(template?.bands)
  if (bandes.length === 0 || zone.w <= 0 || zone.h <= 0) return []

  const emplacements = []
  let yBande = zone.y

  for (const [indexBande, bande] of bandes.entries()) {
    const hauteurBande = (bande.heightPct / 100) * zone.h
    const colonnes = Math.max(0, Math.floor(bande.columns ?? 0))
    const lignes = Math.max(0, Math.floor(bande.rows ?? 0))

    if (colonnes > 0 && lignes > 0) {
      const gH = bande.gutterH ?? grid.gutterH ?? 0
      const gV = bande.gutterV ?? grid.gutterV ?? 0
      const largeur = (zone.w - gH * (colonnes - 1)) / colonnes
      const hauteur = (hauteurBande - gV * (lignes - 1)) / lignes

      // Une bande trop dense pour sa hauteur ne produit rien : mieux vaut une
      // bande vide qu'un empilement de vignettes de hauteur négative.
      if (largeur > 0 && hauteur > 0) {
        for (let r = 0; r < lignes; r++) {
          for (let c = 0; c < colonnes; c++) {
            emplacements.push({
              x: zone.x + c * (largeur + gH),
              y: yBande + r * (hauteur + gV),
              w: largeur,
              h: hauteur,
              // Chaque emplacement se souvient de sa bande : une vignette
              // pleine largeur n'a pas à porter la mise en page conçue pour
              // les petites du bas de page.
              band: indexBande,
              vignetteLayoutId: bande.vignetteLayoutId ?? null,
            })
          }
        }
      }
    }

    yBande += hauteurBande
  }

  return emplacements
}

/**
 * Zone de contenu d'une page : ce qui reste une fois retirées les marges,
 * l'en-tête et le pied.
 */
export function contentZone(grid, dims) {
  return {
    x: grid.margins.left,
    y: grid.margins.top + dims.headerH,
    w: dims.pageW - grid.margins.left - grid.margins.right,
    h: dims.pageH - grid.margins.top - grid.margins.bottom - dims.headerH - dims.footerH,
  }
}

/** Quelques dispositions courantes, proposées à la création d'un gabarit. */
export const TEMPLATE_PRESETS = [
  {
    id: 'uniforme-2x3', name: 'Grille 2 × 3', desc: '6 vignettes égales',
    bands: [{ heightPct: 100, columns: 2, rows: 3 }],
  },
  {
    id: 'mise-en-avant', name: 'Mise en avant', desc: '1 grande, puis 4 petites',
    bands: [
      { heightPct: 50, columns: 1, rows: 1 },
      { heightPct: 50, columns: 2, rows: 2 },
    ],
  },
  {
    id: 'trois-puis-six', name: 'Trois puis six', desc: '3 grandes en haut, 6 petites en bas',
    bands: [
      { heightPct: 50, columns: 3, rows: 1 },
      { heightPct: 50, columns: 3, rows: 2 },
    ],
  },
  {
    id: 'pleine-page', name: 'Pleine page', desc: '1 seule vignette',
    bands: [{ heightPct: 100, columns: 1, rows: 1 }],
  },
  {
    id: 'dense', name: 'Dense', desc: '12 vignettes',
    bands: [{ heightPct: 100, columns: 3, rows: 4 }],
  },
]
