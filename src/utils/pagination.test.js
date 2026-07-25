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
