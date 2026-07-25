import { describe, it, expect } from 'vitest'
import { calcVignetteDimensions, mmToPx, pxToMm, mmToCssPx, PAGE_FORMATS } from './layoutCalculator'

const grid = {
  pageFormat: 'A4',
  orientation: 'portrait',
  margins: { top: 10, right: 10, bottom: 10, left: 10 },
  columns: 2,
  rows: 3,
  gutterH: 5,
  gutterV: 5,
}

describe('calcVignetteDimensions', () => {
  it('répartit la surface utile entre les vignettes et les gouttières', () => {
    const d = calcVignetteDimensions(grid, null, null)
    // A4 210×297, marges 10 de chaque côté → 190×277 utiles
    expect(d.usableWidth).toBe(190)
    expect(d.usableHeight).toBe(277)
    // 2 colonnes, 1 gouttière de 5 → (190-5)/2
    expect(d.vignetteWidth).toBeCloseTo(92.5)
    // 3 rangées, 2 gouttières de 5 → (277-10)/3
    expect(d.vignetteHeight).toBeCloseTo(89)
  })

  it('échange largeur et hauteur en paysage', () => {
    const d = calcVignetteDimensions({ ...grid, orientation: 'landscape' }, null, null)
    expect(d.pageW).toBe(297)
    expect(d.pageH).toBe(210)
  })

  it("retranche la hauteur de l'en-tête et du pied, espacements compris", () => {
    const d = calcVignetteDimensions(
      grid,
      { enabled: true, height: 18, spacingAfter: 4 },
      { enabled: true, height: 8, spacingBefore: 2 },
    )
    expect(d.headerH).toBe(22)
    expect(d.footerH).toBe(10)
    expect(d.usableHeight).toBe(277 - 22 - 10)
  })

  it("ignore l'en-tête et le pied désactivés", () => {
    const d = calcVignetteDimensions(grid, { enabled: false, height: 18 }, { enabled: false, height: 8 })
    expect(d.headerH).toBe(0)
    expect(d.footerH).toBe(0)
  })

  it("applique les hauteurs par défaut quand elles ne sont pas renseignées", () => {
    const d = calcVignetteDimensions(grid, { enabled: true }, { enabled: true })
    expect(d.headerH).toBe(18)
    expect(d.footerH).toBe(8)
  })

  it('retombe sur A4 pour un format inconnu', () => {
    const d = calcVignetteDimensions({ ...grid, pageFormat: 'Poster' }, null, null)
    expect(d.pageW).toBe(PAGE_FORMATS.A4.width)
    expect(d.pageH).toBe(PAGE_FORMATS.A4.height)
  })

  it('plancher à 10mm : une grille trop dense ne produit pas de vignette nulle ou négative', () => {
    const d = calcVignetteDimensions({ ...grid, columns: 40, rows: 40 }, null, null)
    expect(d.vignetteWidth).toBe(10)
    expect(d.vignetteHeight).toBe(10)
  })
})

describe('conversions', () => {
  it('convertit mm ↔ px à 96 dpi et revient au point de départ', () => {
    expect(mmToPx(25.4)).toBeCloseTo(96)
    expect(pxToMm(96)).toBeCloseTo(25.4)
    expect(pxToMm(mmToPx(37))).toBeCloseTo(37)
  })

  it('convertit à 300 dpi pour l\'impression', () => {
    expect(mmToPx(25.4, 300)).toBeCloseTo(300)
  })

  it('applique le zoom en px CSS', () => {
    expect(mmToCssPx(10, 200)).toBeCloseTo(mmToPx(10) * 2)
    expect(mmToCssPx(10, 50)).toBeCloseTo(mmToPx(10) / 2)
  })
})
