import { describe, it, expect } from 'vitest'
import {
  templateSlots, templateCapacity, normalizeBands, contentZone,
  uniformTemplate, TEMPLATE_PRESETS,
} from './pageTemplate'
import { calcVignetteDimensions } from '../utils/layoutCalculator'

const ZONE = { x: 12, y: 15, w: 186, h: 240 }

const troisPuisSix = {
  bands: [
    { heightPct: 50, columns: 3, rows: 1 },
    { heightPct: 50, columns: 3, rows: 2 },
  ],
}

describe('templateCapacity', () => {
  it('additionne les emplacements de chaque bande', () => {
    expect(templateCapacity(troisPuisSix)).toBe(9) // 3 + 6
  })

  it('vaut zéro sur un gabarit vide ou absent', () => {
    expect(templateCapacity({ bands: [] })).toBe(0)
    expect(templateCapacity(null)).toBe(0)
  })

  it('ignore une bande sans colonne ni ligne', () => {
    expect(templateCapacity({ bands: [{ heightPct: 100, columns: 0, rows: 3 }] })).toBe(0)
  })
})

describe('normalizeBands', () => {
  it('ramène les hauteurs à 100 % au total', () => {
    const b = normalizeBands([{ heightPct: 30 }, { heightPct: 30 }])
    expect(b.reduce((t, x) => t + x.heightPct, 0)).toBeCloseTo(100, 6)
  })

  it('conserve les proportions relatives', () => {
    // Deux bandes 1/3 – 2/3 saisies en 10 et 20 doivent le rester.
    const b = normalizeBands([{ heightPct: 10 }, { heightPct: 20 }])
    expect(b[1].heightPct / b[0].heightPct).toBeCloseTo(2, 6)
  })

  it('écarte les bandes de hauteur nulle ou négative', () => {
    expect(normalizeBands([{ heightPct: 100 }, { heightPct: 0 }, { heightPct: -10 }])).toHaveLength(1)
  })

  it('répartit également quand aucune hauteur n\'est utilisable', () => {
    expect(normalizeBands([])).toEqual([])
  })
})

describe('templateSlots', () => {
  it('découpe la zone en bandes puis en sous-grilles', () => {
    const s = templateSlots(troisPuisSix, ZONE)
    expect(s).toHaveLength(9)
  })

  it('suit l\'ordre de lecture', () => {
    const s = templateSlots(troisPuisSix, ZONE)
    // Les trois premiers sur une même ligne, de gauche à droite
    expect(s[0].y).toBeCloseTo(s[1].y, 6)
    expect(s[1].x).toBeGreaterThan(s[0].x)
    // Le quatrième entame la bande suivante, plus bas
    expect(s[3].y).toBeGreaterThan(s[0].y)
  })

  it('donne aux vignettes du haut une plus grande hauteur qu\'à celles du bas', () => {
    // C'est tout l'intérêt du gabarit : 3 grandes puis 6 petites.
    const s = templateSlots(troisPuisSix, ZONE)
    expect(s[0].h).toBeGreaterThan(s[3].h)
    expect(s[0].h).toBeCloseTo(s[3].h * 2, 5)
  })

  it('remplit la zone sans déborder', () => {
    for (const preset of TEMPLATE_PRESETS) {
      for (const s of templateSlots(preset, ZONE)) {
        expect(s.x).toBeGreaterThanOrEqual(ZONE.x - 0.001)
        expect(s.y).toBeGreaterThanOrEqual(ZONE.y - 0.001)
        expect(s.x + s.w).toBeLessThanOrEqual(ZONE.x + ZONE.w + 0.001)
        expect(s.y + s.h).toBeLessThanOrEqual(ZONE.y + ZONE.h + 0.001)
      }
    }
  })

  it('occupe toute la largeur quand il n\'y a pas de gouttière', () => {
    const s = templateSlots({ bands: [{ heightPct: 100, columns: 3, rows: 1 }] }, ZONE)
    expect(s[0].w * 3).toBeCloseTo(ZONE.w, 6)
    expect(s[2].x + s[2].w).toBeCloseTo(ZONE.x + ZONE.w, 6)
  })

  it('retranche les gouttières de la place disponible', () => {
    const sans = templateSlots({ bands: [{ heightPct: 100, columns: 3, rows: 1 }] }, ZONE)
    const avec = templateSlots({ bands: [{ heightPct: 100, columns: 3, rows: 1, gutterH: 6 }] }, ZONE)
    expect(avec[0].w).toBeCloseTo(sans[0].w - 4, 5) // 2 gouttières réparties sur 3 colonnes
  })

  it('reprend les gouttières de la grille quand la bande n\'en définit pas', () => {
    const s = templateSlots({ bands: [{ heightPct: 100, columns: 2, rows: 1 }] }, ZONE, { gutterH: 10 })
    expect(s[1].x - (s[0].x + s[0].w)).toBeCloseTo(10, 6)
  })

  it('ne produit rien pour une bande trop dense pour sa hauteur', () => {
    // Vaut mieux une bande vide que des vignettes de hauteur négative.
    const s = templateSlots({ bands: [{ heightPct: 100, columns: 2, rows: 100, gutterV: 10 }] }, ZONE)
    expect(s).toEqual([])
  })

  it('ne produit rien sur une zone de taille nulle', () => {
    expect(templateSlots(troisPuisSix, { x: 0, y: 0, w: 0, h: 100 })).toEqual([])
  })

  it('s\'adapte au format sans être réécrit', () => {
    // Les hauteurs étant en pourcentage, le même gabarit suit l'A3 comme l'A4.
    const petit = templateSlots(troisPuisSix, ZONE)
    const grand = templateSlots(troisPuisSix, { ...ZONE, w: ZONE.w * 2, h: ZONE.h * 2 })
    expect(grand).toHaveLength(petit.length)
    expect(grand[0].w).toBeCloseTo(petit[0].w * 2, 5)
  })
})

describe('uniformTemplate', () => {
  it('reproduit la grille actuelle en une seule bande', () => {
    const t = uniformTemplate({ columns: 2, rows: 3 })
    expect(templateCapacity(t)).toBe(6)
    expect(t.bands).toHaveLength(1)
  })

  it('produit les mêmes emplacements que la grille d\'origine', () => {
    // Garantie de continuité : un projet existant ne bouge pas.
    const grid = {
      pageFormat: 'A4', orientation: 'portrait',
      margins: { top: 15, bottom: 15, left: 12, right: 12 },
      columns: 2, rows: 3, gutterH: 4, gutterV: 4,
    }
    const dims = calcVignetteDimensions(grid, null, null)
    const s = templateSlots(uniformTemplate(grid), contentZone(grid, dims), grid)

    expect(s).toHaveLength(6)
    expect(s[0].w).toBeCloseTo(dims.vignetteWidth, 5)
    expect(s[0].h).toBeCloseTo(dims.vignetteHeight, 5)
    expect(s[0].x).toBeCloseTo(grid.margins.left, 5)
  })
})

describe('contentZone', () => {
  it('retire les marges, l\'en-tête et le pied', () => {
    const grid = {
      pageFormat: 'A4', orientation: 'portrait',
      margins: { top: 15, bottom: 15, left: 12, right: 12 },
      columns: 2, rows: 3, gutterH: 4, gutterV: 4,
    }
    const dims = calcVignetteDimensions(grid, { enabled: true, height: 18 }, { enabled: true, height: 8 })
    const z = contentZone(grid, dims)
    expect(z.x).toBe(12)
    expect(z.w).toBe(186)
    expect(z.y).toBe(15 + dims.headerH)
    expect(z.h).toBe(297 - 30 - dims.headerH - dims.footerH)
  })
})

describe('TEMPLATE_PRESETS', () => {
  it('propose des dispositions cohérentes et nommées', () => {
    for (const p of TEMPLATE_PRESETS) {
      expect(p.id).toBeTruthy()
      expect(p.name).toBeTruthy()
      expect(templateCapacity(p)).toBeGreaterThan(0)
    }
  })

  it('couvre le cas décrit : trois grandes puis six petites', () => {
    const t = TEMPLATE_PRESETS.find((p) => p.id === 'trois-puis-six')
    expect(templateCapacity(t)).toBe(9)
    const s = templateSlots(t, ZONE)
    expect(s[0].h).toBeGreaterThan(s[8].h)
  })
})
