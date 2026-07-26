import { describe, it, expect } from 'vitest'
import { paginate } from './pagination'

const grid = { columns: 2, rows: 3 } // 6 vignettes par page

const rows = (n, extra = () => ({})) =>
  Array.from({ length: n }, (_, i) => ({ Ref: `R${i + 1}`, ...extra(i) }))

describe('paginate — sans regroupement', () => {
  it('renvoie zéro page sans données', () => {
    expect(paginate([], grid, null)).toEqual([])
    expect(paginate(null, grid, null)).toEqual([])
    expect(paginate(undefined, grid, null)).toEqual([])
  })

  it('remplit exactement les pages quand le compte tombe juste', () => {
    const pages = paginate(rows(12), grid, null)
    expect(pages).toHaveLength(2)
    expect(pages.map(p => p.rows.length)).toEqual([6, 6])
  })

  it('place le reste sur une dernière page incomplète', () => {
    const pages = paginate(rows(13), grid, null)
    expect(pages).toHaveLength(3)
    expect(pages.map(p => p.rows.length)).toEqual([6, 6, 1])
  })

  it('numérote les pages en continu et conserve l\'ordre des lignes', () => {
    const pages = paginate(rows(7), grid, null)
    expect(pages.map(p => p.index)).toEqual([0, 1])
    expect(pages[0].rows[0].Ref).toBe('R1')
    expect(pages[1].rows[0].Ref).toBe('R7')
  })

  it('ne produit aucune page si la grille est vide', () => {
    expect(paginate(rows(10), { columns: 0, rows: 3 }, null)).toEqual([])
  })
})

describe('paginate — capacité par gabarit', () => {
  const troisPuisSix = { bands: [
    { heightPct: 50, columns: 3, rows: 1 },
    { heightPct: 50, columns: 3, rows: 2 },
  ] } // 9 emplacements

  it('remplit selon la capacité du gabarit, pas celle de la grille', () => {
    // La grille dit 6 par page, le gabarit en accepte 9 : c'est lui qui décide.
    const pages = paginate(rows(20), grid, null, { templateFor: () => troisPuisSix })
    expect(pages.map(p => p.rows.length)).toEqual([9, 9, 2])
  })

  it('attache son gabarit à chaque page', () => {
    const pages = paginate(rows(5), grid, null, { templateFor: () => troisPuisSix })
    expect(pages[0].template).toBe(troisPuisSix)
  })

  it('applique un gabarit différent par catégorie', () => {
    // Le cas type : « chocolats » mis en avant sur 9 emplacements, « bonbons »
    // en grille uniforme à 6.
    const data = [
      ...rows(9).map(r => ({ ...r, Famille: 'Chocolats' })),
      ...rows(7).map(r => ({ ...r, Famille: 'Bonbons' })),
    ]
    const pages = paginate(data, grid, 'Famille', {
      templateFor: (cle) => cle === 'Chocolats' ? troisPuisSix : undefined,
    })
    expect(pages.map(p => `${p.groupLabel}:${p.rows.length}`))
      .toEqual(['Chocolats:9', 'Bonbons:6', 'Bonbons:1'])
  })

  it('retombe sur la grille du projet quand aucun gabarit n\'est fourni', () => {
    const sans = paginate(rows(13), grid, null)
    const avecResolveurVide = paginate(rows(13), grid, null, { templateFor: () => undefined })
    expect(avecResolveurVide.map(p => p.rows.length)).toEqual(sans.map(p => p.rows.length))
  })

  it('numérote les pages en continu à travers les groupes', () => {
    const data = [
      ...rows(3).map(r => ({ ...r, Famille: 'A' })),
      ...rows(3).map(r => ({ ...r, Famille: 'B' })),
    ]
    const pages = paginate(data, grid, 'Famille')
    expect(pages.map(p => p.index)).toEqual([0, 1])
  })

  it('ne produit aucune page pour un gabarit sans emplacement', () => {
    // Et surtout : ne boucle pas indéfiniment.
    const vide = { bands: [{ heightPct: 100, columns: 0, rows: 0 }] }
    expect(paginate(rows(10), grid, null, { templateFor: () => vide })).toEqual([])
  })
})

describe('paginate — regroupement par colonne', () => {
  const byFamily = [
    ...rows(2).map(r => ({ ...r, Famille: 'Chaises' })),
    ...rows(8).map(r => ({ ...r, Famille: 'Tables' })),
  ]

  it('démarre une nouvelle page à chaque changement de groupe', () => {
    const pages = paginate(byFamily, grid, 'Famille')
    // 2 chaises → 1 page ; 8 tables → 2 pages (6 + 2)
    expect(pages).toHaveLength(3)
    expect(pages.map(p => p.groupLabel)).toEqual(['Chaises', 'Tables', 'Tables'])
    expect(pages.map(p => p.rows.length)).toEqual([2, 6, 2])
  })

  it('marque la première et la dernière page de chaque groupe', () => {
    const pages = paginate(byFamily, grid, 'Famille')
    expect(pages.map(p => p.isFirstOfGroup)).toEqual([true, true, false])
    expect(pages.map(p => p.isLastOfGroup)).toEqual([true, false, true])
  })

  it('traite une valeur qui réapparaît plus loin comme un nouveau groupe', () => {
    // Choix délibéré : on respecte le tri du fichier source au lieu de le
    // réorganiser. Deux blocs « Chaises » séparés donnent deux groupes.
    const data = [
      { Ref: 'A', Famille: 'Chaises' },
      { Ref: 'B', Famille: 'Tables' },
      { Ref: 'C', Famille: 'Chaises' },
    ]
    const pages = paginate(data, grid, 'Famille')
    expect(pages).toHaveLength(3)
    expect(pages.map(p => p.groupLabel)).toEqual(['Chaises', 'Tables', 'Chaises'])
    expect(pages.every(p => p.isFirstOfGroup && p.isLastOfGroup)).toBe(true)
  })

  it('regroupe les cellules vides ou absentes sous une même clé', () => {
    const data = [
      { Ref: 'A', Famille: null },
      { Ref: 'B' },
      { Ref: 'C', Famille: '' },
    ]
    const pages = paginate(data, grid, 'Famille')
    expect(pages).toHaveLength(1)
    expect(pages[0].groupKey).toBe('')
    expect(pages[0].rows).toHaveLength(3)
  })

  it('compare les valeurs en texte : 10 et "10" forment un seul groupe', () => {
    const data = [{ Ref: 'A', Cat: 10 }, { Ref: 'B', Cat: '10' }]
    const pages = paginate(data, grid, 'Cat')
    expect(pages).toHaveLength(1)
  })
})
