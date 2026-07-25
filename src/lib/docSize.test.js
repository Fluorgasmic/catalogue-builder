import { describe, it, expect } from 'vitest'
import {
  measureDoc, heaviestPaths, assertDocFits, formatBytes,
  FIRESTORE_MAX_BYTES, SAFE_MAX_BYTES,
} from './docSize'

const dataUrl = (ko) => 'data:image/jpeg;base64,' + 'A'.repeat(ko * 1024)

describe('measureDoc', () => {
  it('mesure la taille sérialisée en octets UTF-8', () => {
    expect(measureDoc({ a: 'x' })).toBe(JSON.stringify({ a: 'x' }).length)
  })

  it('compte les caractères accentués sur leur poids réel', () => {
    // « é » pèse 2 octets en UTF-8 : compter les caractères sous-estimerait
    // le document et laisserait passer une écriture que Firestore refuse.
    expect(measureDoc('é')).toBeGreaterThan(JSON.stringify('é').length)
  })
})

describe('heaviestPaths', () => {
  it('trouve les images base64 et les nomme par leur chemin', () => {
    const doc = {
      header: { logo: { src: dataUrl(400) } },
      headerBlocks: [{ type: 'text' }, { type: 'image', directSrc: dataUrl(200) }],
      grid: { columns: 2 },
    }
    const lourds = heaviestPaths(doc)
    expect(lourds[0].path).toBe('header.logo.src')
    expect(lourds[0].isDataUrl).toBe(true)
    expect(lourds[1].path).toBe('headerBlocks[1].directSrc')
  })

  it('ignore les petits champs', () => {
    expect(heaviestPaths({ nom: 'Catalogue', couleur: '#7C5CFC' })).toEqual([])
  })

  it('distingue une grosse chaîne qui n\'est pas une image', () => {
    const lourds = heaviestPaths({ notes: 'x'.repeat(50_000) })
    expect(lourds[0].isDataUrl).toBe(false)
  })
})

describe('assertDocFits', () => {
  it('laisse passer un projet de taille normale', () => {
    const doc = { grid: { columns: 2 }, vignetteBlocks: [{ type: 'text', fontSize: 10 }] }
    expect(() => assertDocFits(doc)).not.toThrow()
    expect(assertDocFits(doc)).toBe(measureDoc(doc))
  })

  it('refuse un projet trop lourd en désignant l\'image fautive', () => {
    const doc = { header: { logo: { src: dataUrl(1000) } } }
    let erreur
    try { assertDocFits(doc) } catch (e) { erreur = e }

    expect(erreur).toBeDefined()
    expect(erreur.code).toBe('doc-too-large')
    expect(erreur.message).toContain('header.logo.src')
    expect(erreur.message).toContain("répertoire d'assets")
    expect(erreur.size).toBeGreaterThan(SAFE_MAX_BYTES)
  })

  it('refuse avant la limite dure, pour garder de la marge', () => {
    // Le document doit être refusé AVANT 1 Mio : les métadonnées (nom, dates,
    // productCount) s'ajoutent au poids mesuré ici.
    expect(SAFE_MAX_BYTES).toBeLessThan(FIRESTORE_MAX_BYTES)
  })

  it('reste explicite quand le poids ne vient pas d\'une image', () => {
    const doc = { vignetteBlocks: [{ texte: 'x'.repeat(950_000) }] }
    let erreur
    try { assertDocFits(doc) } catch (e) { erreur = e }
    expect(erreur.message).toContain('vignetteBlocks[0].texte')
    expect(erreur.message).not.toContain("répertoire d'assets")
  })
})

describe('formatBytes', () => {
  it('choisit l\'unité lisible', () => {
    expect(formatBytes(512)).toBe('512 o')
    expect(formatBytes(2048)).toBe('2.0 ko')
    expect(formatBytes(1_572_864)).toBe('1.5 Mo')
  })
})
