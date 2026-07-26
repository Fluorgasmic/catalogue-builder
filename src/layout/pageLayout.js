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
 * Positions des cases de la grille, en millimètres depuis le coin de la page.
 * L'ordre suit la lecture : de gauche à droite, puis de haut en bas.
 */
export function gridCells(grid, dims) {
  const { margins, columns, rows, gutterH, gutterV } = grid
  const topContenu = margins.top + dims.headerH
  const cases = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      cases.push({
        x: margins.left + c * (dims.vignetteWidth + gutterH),
        y: topContenu + r * (dims.vignetteHeight + gutterV),
      })
    }
  }
  return cases
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
  measurerFor, resolveImage,
}) {
  const primitives = []
  const vars = { pageIndex, totalPages, groupLabel }

  // ── Bandeau d'en-tête ────────────────────────────────────────────────────
  if (header?.enabled && dims.headerH > 0) {
    const hauteurBande = header.height ?? 18
    primitives.push(...bandeau(header.bgColor, grid.margins.top, dims.pageW, hauteurBande))
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

  // ── Grille de vignettes ──────────────────────────────────────────────────
  const cases = gridCells(grid, dims)
  rows.forEach((row, i) => {
    const cellule = cases[i]
    if (!cellule) return
    primitives.push(...offsetPrimitives(
      layoutVignette({
        blocks: vignetteBlocks,
        row,
        widthMm: dims.vignetteWidth,
        heightMm: dims.vignetteHeight,
        measurerFor,
        resolveImage: (b) => resolveImage?.(b, row) ?? null,
      }),
      cellule.x, cellule.y,
    ))
  })

  // ── Bandeau de pied ──────────────────────────────────────────────────────
  if (footer?.enabled && dims.footerH > 0) {
    const hauteurBande = footer.height ?? 8
    const hautPied = dims.pageH - grid.margins.bottom - hauteurBande
    primitives.push(...bandeau(footer.bgColor, hautPied, dims.pageW, hauteurBande))
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

/** Fond pleine largeur d'une zone — rien si la couleur est transparente. */
function bandeau(bgColor, y, largeur, hauteur) {
  if (!bgColor || bgColor === 'transparent') return []
  return [{ kind: 'rect', x: 0, y, w: largeur, h: hauteur, fill: bgColor, radius: 0 }]
}
