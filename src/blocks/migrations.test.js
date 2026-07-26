import { describe, it, expect } from 'vitest'
import { migrateProject, PROJECT_VERSION } from './migrations'

const MM_PAR_PX = 25.4 / 96

const projet = (over = {}) => ({
  version: 2,
  vignetteBlocks: [
    { id: 'a', type: 'badge', position: 'absolute', x: 10, y: 10, width: 20, height: 20 },
    { id: 'b', type: 'text', position: 'flow', x: 0, y: 0, width: null, height: null },
  ],
  headerBlocks: [{ id: 'h', type: 'image', x: 150.6, y: 0, w: 40, h: 18 }],
  ...over,
})

describe('migrateProject', () => {
  it('convertit les coordonnées de vignette en millimètres', () => {
    // 10 px CSS valent 2,646 mm : c'est ce qu'affichait réellement le rendu,
    // alors que le champ annonçait 10 mm.
    const [badge] = migrateProject(projet()).vignetteBlocks
    expect(badge.x).toBeCloseTo(10 * MM_PAR_PX, 6)
    expect(badge.y).toBeCloseTo(10 * MM_PAR_PX, 6)
    expect(badge.width).toBeCloseTo(20 * MM_PAR_PX, 6)
    expect(badge.height).toBeCloseTo(20 * MM_PAR_PX, 6)
  })

  it('ne bouge pas les blocs d\'en-tête, déjà en millimètres', () => {
    const avant = projet()
    const apres = migrateProject(avant)
    expect(apres.headerBlocks).toEqual(avant.headerBlocks)
  })

  it('laisse intactes les propriétés non géométriques', () => {
    const [, texte] = migrateProject(projet()).vignetteBlocks
    expect(texte.id).toBe('b')
    expect(texte.type).toBe('text')
  })

  it('préserve les valeurs nulles au lieu de les transformer en zéro', () => {
    // width: null signifie « largeur automatique » — le convertir en 0
    // ferait disparaître le bloc.
    const [, texte] = migrateProject(projet()).vignetteBlocks
    expect(texte.width).toBeNull()
    expect(texte.height).toBeNull()
  })

  it('inscrit la version courante', () => {
    expect(migrateProject(projet()).version).toBe(PROJECT_VERSION)
  })

  it('est idempotente : rejouée, elle ne convertit pas deux fois', () => {
    // Elle tourne à l'import comme au réhydratage : une double conversion
    // diviserait les positions par 3,78 une fois de plus.
    const une = migrateProject(projet())
    const deux = migrateProject(une)
    expect(deux).toEqual(une)
  })

  it('migre un projet sans numéro de version', () => {
    const sansVersion = { vignetteBlocks: [{ id: 'a', x: 10, y: 0 }] }
    expect(migrateProject(sansVersion).vignetteBlocks[0].x).toBeCloseTo(10 * MM_PAR_PX, 6)
  })

  it('laisse passer un projet vide ou inattendu sans lever d\'erreur', () => {
    expect(migrateProject(null)).toBeNull()
    expect(migrateProject(undefined)).toBeUndefined()
    expect(migrateProject({}).version).toBe(PROJECT_VERSION)
    expect(migrateProject({ version: 1 }).vignetteBlocks).toBeUndefined()
  })

  it('ne touche pas un projet déjà à la version courante', () => {
    const ajour = projet({ version: PROJECT_VERSION })
    expect(migrateProject(ajour)).toBe(ajour)
  })
})
