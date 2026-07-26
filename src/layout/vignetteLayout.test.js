import { describe, it, expect } from 'vitest'
import { layoutVignette, blockContent } from './vignetteLayout'
import { createBlock } from '../blocks/blockTypes'
import { pxToMm } from './measureText'

// Mesure déterministe : la moitié de la taille de police par caractère.
const measurerFor = (style) => (t) => String(t ?? '').length * (style.fontSize / 2)

const VIGNETTE = { widthMm: 91, heightMm: 77.7 }
const ligne = { Reference: 'REF-001', Designation: 'Chaise', Prix: '149,00' }

const poser = (blocks, extra = {}) =>
  layoutVignette({ blocks, row: ligne, ...VIGNETTE, measurerFor, ...extra })

const texte = (over = {}) => ({ ...createBlock('text', ['Reference']), columns: ['Reference'], ...over })

describe('blockContent', () => {
  it('assemble les colonnes liées avec leur séparateur', () => {
    expect(blockContent({ type: 'text', columns: ['Reference', 'Designation'], separator: ' — ' }, ligne))
      .toBe('REF-001 — Chaise')
  })

  it('encadre du préfixe et du suffixe', () => {
    expect(blockContent({ type: 'text', columns: ['Prix'], prefix: 'Prix : ', suffix: ' €' }, ligne))
      .toBe('Prix : 149,00 €')
  })

  it('n\'ajoute ni préfixe ni suffixe à un contenu vide', () => {
    expect(blockContent({ type: 'text', columns: [], prefix: 'Prix : ', suffix: ' €' }, ligne)).toBe('')
  })

  it('rend le nom de colonne entre accolades quand il n\'y a pas de données', () => {
    // C'est ce qu'affiche l'éditeur avant l'import : le bloc montre à quoi
    // il est lié plutôt que du vide.
    expect(blockContent({ type: 'text', columns: ['Reference'] }, null)).toBe('{Reference}')
  })

  it('prend le texte libre d\'un bloc statique', () => {
    expect(blockContent({ type: 'static', staticText: 'Nouveau' }, ligne)).toBe('Nouveau')
  })
})

describe('layoutVignette — unités', () => {
  it('ne produit que des millimètres, jamais de pixels', () => {
    const p = poser([texte()])
    expect(p.length).toBeGreaterThan(0)
    for (const prim of p) {
      for (const cle of Object.keys(prim)) expect(cle.endsWith('Px')).toBe(false)
      expect(prim.x).toBeTypeOf('number')
    }
  })

  it('place un bloc libre à la position demandée, en millimètres', () => {
    // Depuis le format v3, x et y sont des millimètres : 10 signifie 10 mm.
    // Auparavant la valeur était appliquée en pixels CSS et le bloc atterrissait
    // à 2,6 mm, alors que le champ annonçait des millimètres.
    const badge = { ...createBlock('badge', ['Reference']), x: 10, y: 10, conditionOperator: 'notempty', conditionColumn: 'Reference' }
    const [p] = poser([badge], { resolveImage: () => 'logo.png' })
    expect(p.x).toBeCloseTo(10, 4)
    expect(p.y).toBeCloseTo(10, 4)
  })
})

describe('layoutVignette — flux vertical', () => {
  it('empile les blocs les uns sous les autres', () => {
    const p = poser([texte(), texte()])
    const lignes = p.filter(x => x.kind === 'text')
    expect(lignes).toHaveLength(2)
    expect(lignes[1].y).toBeGreaterThan(lignes[0].y)
  })

  it('écarte les blocs qui ne tiennent plus dans la vignette', () => {
    // Une vignette de 77,7 mm ne peut pas recevoir 40 blocs de texte.
    const p = layoutVignette({ blocks: Array.from({ length: 40 }, () => texte()), row: ligne, ...VIGNETTE, measurerFor })
    const lignes = p.filter(x => x.kind === 'text')
    expect(lignes.length).toBeGreaterThan(0)
    expect(lignes.length).toBeLessThan(40)
    for (const l of lignes) expect(l.y).toBeLessThan(VIGNETTE.heightMm)
  })

  it('ignore les blocs masqués', () => {
    const p = poser([texte({ visible: false }), texte()])
    expect(p.filter(x => x.kind === 'text')).toHaveLength(1)
  })

  it('ne produit rien pour un bloc texte sans contenu', () => {
    expect(poser([texte({ columns: [] })])).toEqual([])
  })
})

describe('layoutVignette — texte', () => {
  it('produit une primitive par ligne rendue', () => {
    const bloc = texte({ columns: ['Designation'], maxLines: 3, fontSize: 10 })
    const p = layoutVignette({
      blocks: [bloc],
      row: { Designation: 'Chaise en chêne massif teinté noyer foncé assise garnie tissu bouclé coloris sable piètement fuselé finition huilée' },
      ...VIGNETTE, measurerFor,
    })
    const lignes = p.filter(x => x.kind === 'text')
    expect(lignes.length).toBeGreaterThan(1)
    expect(lignes.length).toBeLessThanOrEqual(3)
  })

  it('espace les lignes de l\'interligne', () => {
    const bloc = texte({ columns: ['Designation'], maxLines: 3, fontSize: 10 })
    const p = layoutVignette({
      blocks: [bloc],
      row: { Designation: 'aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj kkkk llll mmmm nnnn oooo pppp' },
      ...VIGNETTE, measurerFor,
    })
    const l = p.filter(x => x.kind === 'text')
    expect(l[1].y - l[0].y).toBeCloseTo(l[0].lineHeight, 5)
  })

  it('reporte la couleur, l\'alignement et la police', () => {
    const [p] = poser([texte({ color: '#ef4444', align: 'center', fontFamily: 'T StarPro', fontWeight: 700, italic: true })])
    expect(p.color).toBe('#ef4444')
    expect(p.align).toBe('center')
    expect(p.font).toMatchObject({ fontFamily: 'T StarPro', fontWeight: 700, italic: true })
  })

  it('dessine le fond avant le texte', () => {
    const p = poser([texte({ bgColor: '#7C5CFC', bgBorderRadius: 2 })])
    expect(p[0].kind).toBe('rect')
    expect(p[0].fill).toBe('#7C5CFC')
    expect(p[1].kind).toBe('text')
  })

  it('n\'ajoute pas de fond quand il est transparent', () => {
    expect(poser([texte({ bgColor: 'transparent' })]).every(p => p.kind === 'text')).toBe(true)
  })
})

describe('layoutVignette — images et séparateurs', () => {
  it('dimensionne l\'image en pourcentage de la vignette', () => {
    const bloc = { ...createBlock('image', []), heightPct: 50 }
    const [p] = poser([bloc], { resolveImage: () => 'photo.jpg' })
    expect(p.kind).toBe('image')
    expect(p.h).toBeCloseTo(VIGNETTE.heightMm / 2, 4)
    expect(p.w).toBeCloseTo(VIGNETTE.widthMm, 4)
  })

  it('ne produit rien quand l\'image ne se résout pas', () => {
    expect(poser([createBlock('image', [])], { resolveImage: () => null })).toEqual([])
  })

  it('dessine le séparateur comme un trait plein', () => {
    const [p] = poser([{ ...createBlock('separator', []), thickness: 1, color: '#d1d5db' }])
    expect(p.kind).toBe('rect')
    expect(p.fill).toBe('#d1d5db')
    expect(p.h).toBeCloseTo(pxToMm(1), 4)
  })
})

describe('layoutVignette — badge conditionnel', () => {
  const badge = (over) => ({
    ...createBlock('badge', ['Reference']),
    conditionColumn: 'Promo', ...over,
  })
  const avecPromo = { ...ligne, Promo: 'oui' }

  it('affiche le badge quand la condition est vérifiée', () => {
    const p = layoutVignette({
      blocks: [badge({ conditionOperator: '==', conditionValue: 'oui' })],
      row: avecPromo, ...VIGNETTE, measurerFor, resolveImage: () => 'promo.svg',
    })
    expect(p).toHaveLength(1)
    expect(p[0].kind).toBe('image')
  })

  it('masque le badge quand elle ne l\'est pas', () => {
    const p = layoutVignette({
      blocks: [badge({ conditionOperator: '==', conditionValue: 'non' })],
      row: avecPromo, ...VIGNETTE, measurerFor, resolveImage: () => 'promo.svg',
    })
    expect(p).toEqual([])
  })

  it('gère les opérateurs contains et notempty', () => {
    const rendu = (op, val, row) => layoutVignette({
      blocks: [badge({ conditionOperator: op, conditionValue: val })],
      row, ...VIGNETTE, measurerFor, resolveImage: () => 'promo.svg',
    }).length

    expect(rendu('contains', 'ou', avecPromo)).toBe(1)
    expect(rendu('contains', 'zz', avecPromo)).toBe(0)
    expect(rendu('notempty', '', avecPromo)).toBe(1)
    expect(rendu('notempty', '', { ...ligne, Promo: '  ' })).toBe(0)
  })

  it('masque le badge tant qu\'aucune colonne de condition n\'est choisie', () => {
    const p = layoutVignette({
      blocks: [badge({ conditionColumn: null })],
      row: avecPromo, ...VIGNETTE, measurerFor, resolveImage: () => 'promo.svg',
    })
    expect(p).toEqual([])
  })

  it('flotte au-dessus du flux sans consommer de hauteur', () => {
    const sans = poser([texte(), texte()]).filter(p => p.kind === 'text')
    const avec = layoutVignette({
      blocks: [texte(), badge({ conditionOperator: 'notempty' }), texte()],
      row: avecPromo, ...VIGNETTE, measurerFor, resolveImage: () => 'promo.svg',
    }).filter(p => p.kind === 'text')
    expect(avec.map(p => p.y)).toEqual(sans.map(p => p.y))
  })
})
