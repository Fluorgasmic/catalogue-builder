import { describe, it, expect, beforeEach } from 'vitest'
import { register } from '../imageSources/registry'
import {
  setActiveConnection, clearActiveConnection, getActiveConnection,
  subscribeConnection, PRODUCTS, ASSETS,
} from '../imageSources/activeConnection'
import { resolveAssetUrl, blockImageSrc, listAssets, isDirectSrc } from './assetUrl'

const fauxProvider = {
  id: 'faux',
  canList: true,
  resolveUrlSync: (conn, name) => conn.fichiers.includes(name) ? `blob:${name}` : null,
  list: (conn) => conn.fichiers,
}
register(fauxProvider)

beforeEach(() => {
  clearActiveConnection(ASSETS)
  clearActiveConnection(PRODUCTS)
})

describe('emplacements de connexion', () => {
  it('garde les produits et les assets indépendants', () => {
    // C'est la raison d'être des emplacements : connecter le dossier d'assets
    // ne doit pas déconnecter celui des photos produits.
    setActiveConnection({ fichiers: ['photo.jpg'] }, PRODUCTS)
    setActiveConnection({ fichiers: ['logo.png'] }, ASSETS)

    expect(getActiveConnection(PRODUCTS).fichiers).toEqual(['photo.jpg'])
    expect(getActiveConnection(ASSETS).fichiers).toEqual(['logo.png'])

    clearActiveConnection(ASSETS)
    expect(getActiveConnection(PRODUCTS)).not.toBeNull()
  })

  it('vise les produits quand aucun emplacement n\'est précisé', () => {
    setActiveConnection({ fichiers: [] })
    expect(getActiveConnection(PRODUCTS)).not.toBeNull()
    expect(getActiveConnection(ASSETS)).toBeNull()
  })

  it('ne notifie que les abonnés de l\'emplacement concerné', () => {
    const vus = []
    subscribeConnection(() => vus.push(PRODUCTS), PRODUCTS)
    subscribeConnection(() => vus.push(ASSETS), ASSETS)

    setActiveConnection({ fichiers: [] }, ASSETS)
    expect(vus).toEqual([ASSETS])
  })
})

describe('resolveAssetUrl', () => {
  it('résout un nom de fichier via le provider d\'assets', () => {
    setActiveConnection({ fichiers: ['logo.png'] }, ASSETS)
    expect(resolveAssetUrl('logo.png', 'faux')).toBe('blob:logo.png')
  })

  it('renvoie null si le fichier est absent du répertoire', () => {
    setActiveConnection({ fichiers: ['autre.png'] }, ASSETS)
    expect(resolveAssetUrl('logo.png', 'faux')).toBeNull()
  })

  it('renvoie null tant que le répertoire n\'est pas connecté', () => {
    expect(resolveAssetUrl('logo.png', 'faux')).toBeNull()
  })

  it('ne consulte pas la connexion des produits', () => {
    setActiveConnection({ fichiers: ['logo.png'] }, PRODUCTS)
    expect(resolveAssetUrl('logo.png', 'faux')).toBeNull()
  })

  it('laisse passer une URL absolue telle quelle', () => {
    expect(resolveAssetUrl('https://exemple.fr/logo.png', 'faux')).toBe('https://exemple.fr/logo.png')
  })
})

describe('blockImageSrc — compatibilité des projets existants', () => {
  it('préfère la référence quand elle se résout', () => {
    setActiveConnection({ fichiers: ['logo.png'] }, ASSETS)
    const src = blockImageSrc({ assetName: 'logo.png', legacySrc: 'data:image/png;base64,AAA', providerId: 'faux' })
    expect(src).toBe('blob:logo.png')
  })

  it('retombe sur le base64 hérité quand la référence ne résout pas', () => {
    // Un projet créé avant les assets embarque son image : il doit continuer
    // de s'afficher, y compris répertoire déconnecté.
    const src = blockImageSrc({ assetName: 'logo.png', legacySrc: 'data:image/png;base64,AAA', providerId: 'faux' })
    expect(src).toBe('data:image/png;base64,AAA')
  })

  it('affiche le base64 hérité même sans référence', () => {
    expect(blockImageSrc({ legacySrc: 'data:image/png;base64,AAA' })).toBe('data:image/png;base64,AAA')
  })

  it('renvoie null quand il n\'y a ni l\'un ni l\'autre', () => {
    expect(blockImageSrc({})).toBeNull()
    expect(blockImageSrc({ legacySrc: 'pas-une-source' })).toBeNull()
  })
})

describe('listAssets', () => {
  it('liste les fichiers du répertoire connecté', () => {
    setActiveConnection({ fichiers: ['a.png', 'b.svg'] }, ASSETS)
    expect(listAssets('faux')).toEqual(['a.png', 'b.svg'])
  })

  it('renvoie une liste vide pour un provider qui ne sait pas énumérer', () => {
    register({ id: 'sansListe', canList: false })
    setActiveConnection({ fichiers: ['a.png'] }, ASSETS)
    expect(listAssets('sansListe')).toEqual([])
  })

  it('renvoie une liste vide sans connexion', () => {
    expect(listAssets('faux')).toEqual([])
  })
})

describe('isDirectSrc', () => {
  it('reconnaît les sources directement affichables', () => {
    expect(isDirectSrc('data:image/png;base64,AAA')).toBe(true)
    expect(isDirectSrc('https://exemple.fr/a.png')).toBe(true)
    expect(isDirectSrc('blob:xyz')).toBe(true)
    expect(isDirectSrc('logo.png')).toBe(false)
    expect(isDirectSrc(null)).toBe(false)
  })
})
