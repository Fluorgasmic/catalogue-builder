// ─── Page dimensions (mm) ─────────────────────────────────────────────────────

/**
 * Formats normalisés, en millimètres, toujours exprimés en portrait —
 * l'orientation paysage échange largeur et hauteur au calcul.
 */
export const PAGE_FORMATS = {
  A6:      { width: 105,   height: 148,   label: 'A6' },
  A5:      { width: 148,   height: 210,   label: 'A5' },
  A4:      { width: 210,   height: 297,   label: 'A4' },
  A3:      { width: 297,   height: 420,   label: 'A3' },
  A2:      { width: 420,   height: 594,   label: 'A2' },
  Letter:  { width: 215.9, height: 279.4, label: 'US Letter' },
  Legal:   { width: 215.9, height: 355.6, label: 'US Legal' },
  Tabloid: { width: 279.4, height: 431.8, label: 'US Tabloid' },
}

/** Identifiant du format libre : les dimensions viennent alors de la grille. */
export const CUSTOM_FORMAT = 'custom'

/** Bornes du format libre, en mm — au-delà, ni l'écran ni les imprimeurs ne suivent. */
export const CUSTOM_MIN_MM = 20
export const CUSTOM_MAX_MM = 2000

const clampCustom = (v, fallback) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(CUSTOM_MAX_MM, Math.max(CUSTOM_MIN_MM, n))
}

/**
 * Dimensions de la page en portrait, avant orientation.
 * Un format inconnu retombe sur A4 plutôt que de casser la mise en page.
 */
export function resolvePageSize(grid) {
  if (grid?.pageFormat === CUSTOM_FORMAT) {
    return {
      width: clampCustom(grid.customWidth, PAGE_FORMATS.A4.width),
      height: clampCustom(grid.customHeight, PAGE_FORMATS.A4.height),
    }
  }
  return PAGE_FORMATS[grid?.pageFormat] ?? PAGE_FORMATS.A4
}

/**
 * Calculate vignette dimensions based on grid settings.
 * Returns { vignetteWidth, vignetteHeight, usableWidth, usableHeight } in mm.
 */
export function calcVignetteDimensions(grid, header, footer) {
  const fmt = resolvePageSize(grid)
  const { width: pageW, height: pageH } = grid.orientation === 'landscape'
    ? { width: fmt.height, height: fmt.width }
    : fmt

  const { margins, columns, rows, gutterH, gutterV } = grid
  const headerH = header?.enabled ? (header.height ?? 18) + (header.spacingAfter ?? 0) : 0
  const footerH = footer?.enabled ? (footer.height ?? 8) + (footer.spacingBefore ?? 0) : 0

  const usableWidth = pageW - margins.left - margins.right
  const usableHeight = pageH - margins.top - margins.bottom - headerH - footerH

  const vignetteWidth = (usableWidth - gutterH * (columns - 1)) / columns
  const vignetteHeight = (usableHeight - gutterV * (rows - 1)) / rows

  return {
    pageW,
    pageH,
    usableWidth,
    usableHeight,
    vignetteWidth: Math.max(vignetteWidth, 10),
    vignetteHeight: Math.max(vignetteHeight, 10),
    headerH,
    footerH,
  }
}

/**
 * Convert mm to pixels at a given DPI (default 96 for screen, 300 for print).
 */
export function mmToPx(mm, dpi = 96) {
  return (mm / 25.4) * dpi
}

/**
 * Convert pixels to mm at a given DPI.
 */
export function pxToMm(px, dpi = 96) {
  return (px / dpi) * 25.4
}

/**
 * Scale factor to convert mm → CSS px for a given zoom level (%).
 * At zoom=100, 1mm = 3.7795px (96dpi).
 */
export function mmToCssPx(mm, zoom = 100) {
  return mmToPx(mm) * (zoom / 100)
}
