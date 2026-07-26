import { describe, it, expect } from 'vitest'
import {
  calcVignetteDimensions, mmToPx, pxToMm, mmToCssPx,
  PAGE_FORMATS, resolvePageSize, CUSTOM_FORMAT, CUSTOM_MIN_MM, CUSTOM_MAX_MM,
} from './layoutCalculator'

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

describe('resolvePageSize', () => {
  it('donne les formats normalisés en portrait', () => {
    expect(resolvePageSize({ pageFormat: 'A4' })).toEqual(PAGE_FORMATS.A4)
    expect(resolvePageSize({ pageFormat: 'A5' }).width).toBe(148)
    expect(resolvePageSize({ pageFormat: 'Tabloid' }).height).toBe(431.8)
  })

  it('enchaîne les formats A en doublant la surface', () => {
    // A5 est la moitié d'A4, qui est la moitié d'A3 : la hauteur de l'un est
    // la largeur du suivant. Ce test protège d'une faute de frappe dans la table.
    expect(PAGE_FORMATS.A5.height).toBe(PAGE_FORMATS.A4.width)
    expect(PAGE_FORMATS.A4.height).toBe(PAGE_FORMATS.A3.width)
    expect(PAGE_FORMATS.A3.height).toBe(PAGE_FORMATS.A2.width)
  })

  it('utilise les dimensions saisies pour un format libre', () => {
    expect(resolvePageSize({ pageFormat: CUSTOM_FORMAT, customWidth: 250, customHeight: 250 }))
      .toEqual({ width: 250, height: 250 })
  })

  it('borne un format libre aberrant au lieu de casser la mise en page', () => {
    const minus = resolvePageSize({ pageFormat: CUSTOM_FORMAT, customWidth: -50, customHeight: 0 })
    expect(minus).toEqual({ width: CUSTOM_MIN_MM, height: CUSTOM_MIN_MM })

    const enorme = resolvePageSize({ pageFormat: CUSTOM_FORMAT, customWidth: 99999, customHeight: 99999 })
    expect(enorme).toEqual({ width: CUSTOM_MAX_MM, height: CUSTOM_MAX_MM })
  })

  it('retombe sur les dimensions A4 quand le format libre n\'est pas renseigné', () => {
    const { width, height } = resolvePageSize({ pageFormat: CUSTOM_FORMAT })
    expect({ width, height }).toEqual({ width: PAGE_FORMATS.A4.width, height: PAGE_FORMATS.A4.height })
    expect(resolvePageSize({ pageFormat: CUSTOM_FORMAT, customWidth: 'abc' }).width).toBe(210)
  })

  it('retombe sur A4 pour un format inconnu ou absent', () => {
    expect(resolvePageSize({ pageFormat: 'Poster' })).toEqual(PAGE_FORMATS.A4)
    expect(resolvePageSize({})).toEqual(PAGE_FORMATS.A4)
    expect(resolvePageSize(null)).toEqual(PAGE_FORMATS.A4)
  })
})

describe('calcVignetteDimensions — formats', () => {
  it('accepte un format libre, orientation comprise', () => {
    const libre = { ...grid, pageFormat: CUSTOM_FORMAT, customWidth: 300, customHeight: 200 }
    expect(calcVignetteDimensions(libre, null, null).pageW).toBe(300)
    expect(calcVignetteDimensions({ ...libre, orientation: 'landscape' }, null, null).pageW).toBe(200)
  })

  it('recalcule les vignettes quand on change de format', () => {
    const a5 = calcVignetteDimensions({ ...grid, pageFormat: 'A5' }, null, null)
    const a3 = calcVignetteDimensions({ ...grid, pageFormat: 'A3' }, null, null)
    expect(a3.vignetteWidth).toBeGreaterThan(a5.vignetteWidth)
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
