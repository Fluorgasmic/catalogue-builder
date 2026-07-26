/**
 * Transforme une page de catalogue en liste de primitives de dessin.
 *
 * Assemble ce que l'écran assemble aujourd'hui en CSS : bandeaux d'en-tête et
 * de pied, blocs libres de ces zones, puis la grille de vignettes. Chaque
 * vignette est mise en page par layoutVignette, et ses primitives sont
 * décalées à la position de sa case.
 *
 * Tout est en millimètres, origine en haut à gauche de la page.
 */

import { layoutVignette, layoutFreeBlocks } from './vignetteLayout'
import { templateSlots, contentZone, uniformTemplate } from '../document/pageTemplate'

/** Substitue les variables de gabarit d'un bloc statique. */
export function resolveTemplateVars(blocks, { pageIndex = 0, totalPages = 1, groupLabel = '' } = {}) {
  return blocks
    .filter((b) => b.visible !== false)
    .map((b) => {
      if (b.type !== 'static' || !b.staticText) return b
      return {
        ...b,
        staticText: b.staticText
          .replace(/\{page\}/g, String(pageIndex + 1))
          .replace(/\{total\}/g, String(totalPages))
          .replace(/\{group\}/g, groupLabel ?? ''),
      }
    })
}

/** Décale un jeu de primitives — sert à poser une vignette dans sa case. */
export function offsetPrimitives(primitives, dx, dy) {
  return primitives.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }))
}

/**
 * Emplacements de vignettes d'une page, en millimètres.
 *
 * Sans gabarit, la grille uniforme du projet s'applique — le comportement
 * historique. Avec, c'est le gabarit qui commande, et les emplacements
 * peuvent alors avoir des tailles différentes sur une même page.
 */
export function gridCells(grid, dims, template) {
  const gabarit = template ?? uniformTemplate(grid)
  return templateSlots(gabarit, contentZone(grid, dims), grid)
}

/**
 * @param {object} p
 * @param {object[]} p.rows            produits de la page
 * @param {object} p.grid
 * @param {object} p.header
 * @param {object} p.footer
 * @param {object[]} p.headerBlocks
 * @param {object[]} p.footerBlocks
 * @param {object[]} p.vignetteBlocks
 * @param {object} p.dims              sortie de calcVignetteDimensions
 * @param {number} [p.pageIndex]
 * @param {number} [p.totalPages]
 * @param {string} [p.groupLabel]
 * @param {(style) => (t) => number} p.measurerFor
 * @param {(block, row) => string|null} [p.resolveImage]
 * @returns {object[]} primitives de la page, en mm
 */
export function layoutPage({
  rows = [], grid, header, footer, headerBlocks = [], footerBlocks = [], vignetteBlocks = [],
  dims, pageIndex = 0, totalPages = 1, groupLabel = '',
  measurerFor, resolveImage, bleedMm = 0, template = null,
}) {
  const primitives = []
  const vars = { pageIndex, totalPages, groupLabel }

  // ── Bandeau d'en-tête ────────────────────────────────────────────────────
  if (header?.enabled && dims.headerH > 0) {
    const hauteurBande = header.height ?? 18
    primitives.push(...bandeau(header.bgColor, grid.margins.top, dims.pageW, hauteurBande, { bleed: bleedMm, pageH: dims.pageH }))
    primitives.push(...offsetPrimitives(
      layoutFreeBlocks({
        blocks: resolveTemplateVars(headerBlocks, vars),
        row: rows[0] ?? null,
        widthMm: dims.pageW - grid.margins.left - grid.margins.right,
        heightMm: hauteurBande,
        measurerFor,
        resolveImage: (b) => resolveImage?.(b, rows[0] ?? null) ?? null,
      }),
      0, grid.margins.top,
    ))
  }

  // ── Vignettes, posées aux emplacements du gabarit ────────────────────────
  // Chaque emplacement porte ses propres dimensions : sur un gabarit mixte,
  // une vignette du haut n'a pas la taille de celles du bas, et sa mise en
  // page est donc recalculée à sa mesure.
  const emplacements = gridCells(grid, dims, template)
  rows.forEach((row, i) => {
    const place = emplacements[i]
    if (!place) return
    primitives.push(...offsetPrimitives(
      layoutVignette({
        blocks: vignetteBlocks,
        row,
        widthMm: place.w,
        heightMm: place.h,
        measurerFor,
        resolveImage: (b) => resolveImage?.(b, row) ?? null,
      }),
      place.x, place.y,
    ))
  })

  // ── Bandeau de pied ──────────────────────────────────────────────────────
  if (footer?.enabled && dims.footerH > 0) {
    const hauteurBande = footer.height ?? 8
    const hautPied = dims.pageH - grid.margins.bottom - hauteurBande
    primitives.push(...bandeau(footer.bgColor, hautPied, dims.pageW, hauteurBande, { bleed: bleedMm, pageH: dims.pageH }))
    primitives.push(...offsetPrimitives(
      layoutFreeBlocks({
        blocks: resolveTemplateVars(footerBlocks, vars),
        row: rows[0] ?? null,
        widthMm: dims.pageW - grid.margins.left - grid.margins.right,
        heightMm: hauteurBande,
        measurerFor,
        resolveImage: (b) => resolveImage?.(b, rows[0] ?? null) ?? null,
      }),
      0, hautPied,
    ))
  }

  return primitives
}

/**
 * Fond pleine largeur d'une zone — rien si la couleur est transparente.
 *
 * Avec un fond perdu, le bandeau déborde latéralement, et verticalement dès
 * qu'il touche un bord de page : c'est ce qui évite le liseré blanc quand la
 * coupe ripe de quelques dixièmes. Un en-tête à fond perdu s'obtient donc en
 * mettant la marge haute à zéro.
 */
function bandeau(bgColor, y, largeur, hauteur, { bleed = 0, pageH = 0 } = {}) {
  if (!bgColor || bgColor === 'transparent') return []
  if (bleed <= 0) {
    return [{ kind: 'rect', x: 0, y, w: largeur, h: hauteur, fill: bgColor, radius: 0 }]
  }

  const toucheHaut = y <= 0.001
  const toucheBas = Math.abs(y + hauteur - pageH) <= 0.001
  const yEtendu = toucheHaut ? -bleed : y
  const hEtendue = hauteur + (toucheHaut ? bleed : 0) + (toucheBas ? bleed : 0)

  return [{
    kind: 'rect',
    x: -bleed, y: yEtendu,
    w: largeur + bleed * 2, h: hEtendue,
    fill: bgColor, radius: 0,
  }]
}
