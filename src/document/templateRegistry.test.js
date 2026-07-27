import { describe, it, expect } from 'vitest'
import { allTemplates, findTemplate, templateResolver, distinctGroupValues } from './templateRegistry'
import { TEMPLATE_PRESETS } from './pageTemplate'

const perso = [
  { id: 'maison', name: 'Maison', bands: [{ heightPct: 100, columns: 4, rows: 4 }] },
  { id: 'pleine-page', name: 'Ma pleine page', bands: [{ heightPct: 100, columns: 1, rows: 2 }] },
]

describe('allTemplates', () => {
  it('réunit les dispositions livrées et les personnelles', () => {
    const tous = allTemplates(perso)
    expect(tous.some((t) => t.id === 'maison')).toBe(true)
    expect(tous.some((t) => t.id === 'trois-puis-six')).toBe(true)
  })

  it('laisse une disposition personnelle remplacer celle du même identifiant', () => {
    // Permet d'ajuster une disposition fournie sans avoir à la renommer.
    const tous = allTemplates(perso)
    const trouves = tous.filter((t) => t.id === 'pleine-page')
    expect(trouves).toHaveLength(1)
    expect(trouves[0].name).toBe('Ma pleine page')
  })

  it('rend les dispositions livrées quand il n\'y en a aucune de personnelle', () => {
    expect(allTemplates()).toHaveLength(TEMPLATE_PRESETS.length)
    expect(allTemplates([])).toHaveLength(TEMPLATE_PRESETS.length)
  })
})

describe('findTemplate', () => {
  it('trouve par identifiant', () => {
    expect(findTemplate('trois-puis-six').name).toBe('Trois puis six')
    expect(findTemplate('maison', perso).name).toBe('Maison')
  })

  it('renvoie null sur un identifiant absent ou inconnu', () => {
    // Un gabarit supprimé mais encore affecté ne doit pas casser le catalogue :
    // l'appelant retombera sur la grille du projet.
    expect(findTemplate(null)).toBeNull()
    expect(findTemplate('')).toBeNull()
    expect(findTemplate('disparu', perso)).toBeNull()
  })
})

describe('templateResolver', () => {
  it('rend le gabarit affecté à la catégorie', () => {
    const r = templateResolver({ templateByGroup: { Chocolats: 'trois-puis-six' } })
    expect(r('Chocolats').id).toBe('trois-puis-six')
  })

  it('retombe sur le gabarit par défaut pour les autres catégories', () => {
    const r = templateResolver({
      templateByGroup: { Chocolats: 'trois-puis-six' },
      defaultTemplateId: 'dense',
    })
    expect(r('Bonbons').id).toBe('dense')
  })

  it('applique le gabarit par défaut quand il n\'y a pas de catégorie', () => {
    const r = templateResolver({ defaultTemplateId: 'dense' })
    expect(r(null).id).toBe('dense')
  })

  it('ne rend rien sans affectation ni défaut — la grille du projet s\'applique', () => {
    expect(templateResolver()(null)).toBeUndefined()
    expect(templateResolver({})('Chocolats')).toBeUndefined()
  })

  it('ne rend rien pour un gabarit affecté puis supprimé', () => {
    const r = templateResolver({ templateByGroup: { Chocolats: 'efface' } })
    expect(r('Chocolats')).toBeUndefined()
  })

  it('résout aussi les gabarits personnels', () => {
    const r = templateResolver({ templateByGroup: { Chocolats: 'maison' }, custom: perso })
    expect(r('Chocolats').name).toBe('Maison')
  })
})

describe('distinctGroupValues', () => {
  const data = [
    { Famille: 'Chocolats' }, { Famille: 'Chocolats' },
    { Famille: 'Bonbons' }, { Famille: 'Chocolats' },
  ]

  it('liste les valeurs distinctes dans leur ordre d\'apparition', () => {
    expect(distinctGroupValues(data, 'Famille')).toEqual(['Chocolats', 'Bonbons'])
  })

  it('rend une liste vide sans colonne de regroupement', () => {
    expect(distinctGroupValues(data, null)).toEqual([])
    expect(distinctGroupValues([], 'Famille')).toEqual([])
  })

  it('range les cellules vides sous une même valeur', () => {
    const avecVides = [{ Famille: null }, { Famille: '' }, {}]
    expect(distinctGroupValues(avecVides, 'Famille')).toEqual([''])
  })
})
