// ─── Page dimensions (mm) ─────────────────────────────────────────────────────

export const PAGE_FORMATS = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
}

/**
 * Calculate vignette dimensions based on grid settings.
 * Returns { vignetteWidth, vignetteHeight, usableWidth, usableHeight } in mm.
 */
export function calcVignetteDimensions(grid, header, footer) {
  const fmt = PAGE_FORMATS[grid.pageFormat] ?? PAGE_FORMATS.A4
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
