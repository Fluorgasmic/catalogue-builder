import { describe, it, expect } from 'vitest'
import { layoutPage, gridCells, offsetPrimitives, resolveTemplateVars } from './pageLayout'
import { calcVignetteDimensions } from '../utils/layoutCalculator'
import { createBlock } from '../blocks/blockTypes'

const measurerFor = (s) => (t) => String(t ?? '').length * (s.fontSize / 2)

const grid = {
  pageFormat: 'A4', orientation: 'portrait',
  margins: { top: 15, bottom: 15, left: 12, right: 12 },
  columns: 2, rows: 3, gutterH: 4, gutterV: 4,
}
const header = { enabled: true, height: 18, spacingAfter: 0, bgColor: '#7C5CFC' }
const footer = { enabled: true, height: 8, spacingBefore: 0, bgColor: 'transparent' }
const dims = calcVignetteDimensions(grid, header, footer)

const produits = Array.from({ length: 6 }, (_, i) => ({
  Reference: `REF-00${i + 1}`, Designation: `Produit ${i + 1}`,
}))

const blocsVignette = [
  { ...createBlock('text', ['Reference']), columns: ['Reference'] },
]

const poser = (over = {}) => layoutPage({
  rows: produits, grid, header, footer,
  vignetteBlocks: blocsVignette, dims, measurerFor, ...over,
})

describe('gridCells', () => {
  it('produit une case par emplacement de la grille', () => {
    expect(gridCells(grid, dims)).toHaveLength(6)
  })

  it('démarre à la marge, sous l\'en-tête', () => {
    const [premiere] = gridCells(grid, dims)
    expect(premiere.x).toBe(grid.margins.left)
    expect(premiere.y).toBe(grid.margins.top + dims.headerH)
  })

  it('espace les cases de la vignette plus la gouttière', () => {
    const cases = gridCells(grid, dims)
    expect(cases[1].x - cases[0].x).toBeCloseTo(dims.vignetteWidth + grid.gutterH, 6)
    expect(cases[2].y - cases[0].y).toBeCloseTo(dims.vignetteHeight + grid.gutterV, 6)
  })

  it('suit le sens de lecture : la deuxième case est à droite, pas en dessous', () => {
    const cases = gridCells(grid, dims)
    expect(cases[1].y).toBe(cases[0].y)
    expect(cases[1].x).toBeGreaterThan(cases[0].x)
  })

  it('tient dans la page', () => {
    for (const c of gridCells(grid, dims)) {
      expect(c.x + dims.vignetteWidth).toBeLessThanOrEqual(dims.pageW - grid.margins.right + 0.01)
      expect(c.y + dims.vignetteHeight).toBeLessThanOrEqual(dims.pageH - grid.margins.bottom + 0.01)
    }
  })
})

describe('resolveTemplateVars', () => {
  it('remplace le numéro de page, le total et le groupe', () => {
    const [b] = resolveTemplateVars(
      [{ type: 'static', staticText: 'Page {page} / {total} — {group}' }],
      { pageIndex: 2, totalPages: 9, groupLabel: 'Chocolats' },
    )
    expect(b.staticText).toBe('Page 3 / 9 — Chocolats')
  })

  it('remplace toutes les occurrences', () => {
    const [b] = resolveTemplateVars([{ type: 'static', staticText: '{page}-{page}' }], { pageIndex: 0 })
    expect(b.staticText).toBe('1-1')
  })

  it('ne touche pas les blocs liés à des colonnes', () => {
    const bloc = { type: 'text', columns: ['Reference'] }
    expect(resolveTemplateVars([bloc], {})[0]).toBe(bloc)
  })

  it('écarte les blocs masqués', () => {
    expect(resolveTemplateVars([{ type: 'static', staticText: 'x', visible: false }], {})).toEqual([])
  })
})

describe('offsetPrimitives', () => {
  it('décale sans altérer le reste', () => {
    const [p] = offsetPrimitives([{ kind: 'rect', x: 1, y: 2, w: 3, h: 4, fill: '#000000' }], 10, 20)
    expect(p).toMatchObject({ x: 11, y: 22, w: 3, h: 4, fill: '#000000' })
  })
})

describe('layoutPage — gabarits', () => {
  const troisPuisSix = { bands: [
    { heightPct: 50, columns: 3, rows: 1 },
    { heightPct: 50, columns: 3, rows: 2 },
  ] }

  it('pose les vignettes aux emplacements du gabarit', () => {
    const neuf = Array.from({ length: 9 }, (_, i) => ({ Reference: `R${i}` }))
    const p = layoutPage({
      rows: neuf, grid, header, footer, vignetteBlocks: blocsVignette, dims,
      measurerFor, template: troisPuisSix,
    })
    expect(p.filter(x => x.kind === 'text')).toHaveLength(9)
  })

  it('met en page chaque vignette à la taille de son emplacement', () => {
    // Sur un gabarit mixte, une vignette du haut est deux fois plus haute que
    // celles du bas : c'est tout l'intérêt, et le texte doit suivre.
    const cases = gridCells(grid, dims, troisPuisSix)
    expect(cases[0].h).toBeGreaterThan(cases[3].h)
    expect(cases[0].w).toBeCloseTo(cases[3].w, 5)
  })

  it('garde la grille du projet quand aucun gabarit n\'est fourni', () => {
    const avec = gridCells(grid, dims, null)
    expect(avec).toHaveLength(grid.columns * grid.rows)
    expect(avec[0].w).toBeCloseTo(dims.vignetteWidth, 5)
  })
})

describe('layoutPage', () => {
  it('pose une vignette par produit, à sa case', () => {
    const p = poser()
    const textes = p.filter((x) => x.kind === 'text')
    expect(textes).toHaveLength(6)

    const cases = gridCells(grid, dims)
    // Chaque texte doit tomber dans les limites de sa case.
    textes.forEach((t, i) => {
      expect(t.x).toBeGreaterThanOrEqual(cases[i].x)
      expect(t.y).toBeGreaterThanOrEqual(cases[i].y)
    })
  })

  it('n\'invente pas de vignettes quand la page est incomplète', () => {
    const p = layoutPage({ rows: produits.slice(0, 2), grid, header, footer, vignetteBlocks: blocsVignette, dims, measurerFor })
    expect(p.filter((x) => x.kind === 'text')).toHaveLength(2)
  })

  it('ignore les produits en trop plutôt que de déborder de la page', () => {
    const trop = Array.from({ length: 10 }, (_, i) => ({ Reference: `R${i}` }))
    const p = layoutPage({ rows: trop, grid, header, footer, vignetteBlocks: blocsVignette, dims, measurerFor })
    expect(p.filter((x) => x.kind === 'text')).toHaveLength(6)
  })

  it('dessine le bandeau d\'en-tête sur toute la largeur', () => {
    const bandeau = poser().find((x) => x.kind === 'rect' && x.fill === '#7C5CFC')
    expect(bandeau).toBeDefined()
    expect(bandeau.x).toBe(0)
    expect(bandeau.w).toBe(dims.pageW)
    expect(bandeau.y).toBe(grid.margins.top)
  })

  it('ne dessine pas de bandeau transparent', () => {
    // Le pied est transparent : aucun rectangle ne doit être posé pour lui.
    const p = poser()
    const basDePage = p.filter((x) => x.kind === 'rect' && x.y > dims.pageH / 2)
    expect(basDePage).toHaveLength(0)
  })

  it('place les blocs de pied en bas de page', () => {
    const p = poser({
      footerBlocks: [{ ...createBlock('static', []), staticText: 'Page {page} / {total}', x: 80, y: 2 }],
      pageIndex: 1, totalPages: 4,
    })
    const pied = p.filter((x) => x.kind === 'text' && x.text.startsWith('Page'))
    expect(pied).toHaveLength(1)
    expect(pied[0].text).toBe('Page 2 / 4')
    expect(pied[0].y).toBeGreaterThan(dims.pageH - grid.margins.bottom - 8 - 1)
  })

  it('place les blocs d\'en-tête dans la zone d\'en-tête', () => {
    const p = poser({
      headerBlocks: [{ ...createBlock('static', []), staticText: 'CHOCOLATS', x: 12, y: 4 }],
    })
    const titre = p.find((x) => x.kind === 'text' && x.text === 'CHOCOLATS')
    expect(titre).toBeDefined()
    expect(titre.y).toBeGreaterThanOrEqual(grid.margins.top)
    expect(titre.y).toBeLessThan(grid.margins.top + 18)
  })

  it('omet l\'en-tête et le pied désactivés', () => {
    const p = layoutPage({
      rows: produits, grid,
      header: { ...header, enabled: false }, footer: { ...footer, enabled: false },
      headerBlocks: [{ ...createBlock('static', []), staticText: 'CHOCOLATS', x: 12, y: 4 }],
      vignetteBlocks: blocsVignette,
      dims: calcVignetteDimensions(grid, { enabled: false }, { enabled: false }),
      measurerFor,
    })
    expect(p.find((x) => x.kind === 'text' && x.text === 'CHOCOLATS')).toBeUndefined()
  })

  it('ne produit rien pour une page sans produit ni décor', () => {
    expect(layoutPage({
      rows: [], grid,
      header: { enabled: false }, footer: { enabled: false },
      vignetteBlocks: blocsVignette,
      dims: calcVignetteDimensions(grid, { enabled: false }, { enabled: false }),
      measurerFor,
    })).toEqual([])
  })
})
