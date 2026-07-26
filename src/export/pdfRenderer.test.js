import { describe, it, expect } from 'vitest'
import { PDFDocument, PDFName } from 'pdf-lib'
import { renderPdf } from './pdfRenderer'
import { mmToPt } from './pdfPrimitives'

/** Entrée du dictionnaire de ressources d'une page (Font, XObject…). */
const ressource = (page, nom) => page.node.Resources()?.lookup(PDFName.of(nom))

/**
 * Polices réellement embarquées, par leur BaseFont.
 * pdf-lib crée une entrée de ressource par appel de dessin, toutes pointant
 * vers la même police : compter les entrées surestimerait le nombre de polices.
 */
function policesEmbarquees(page) {
  const dict = ressource(page, 'Font')
  if (!dict) return []
  const noms = dict.keys().map((cle) => dict.lookup(cle)?.get(PDFName.of('BaseFont'))?.toString())
  return [...new Set(noms.filter(Boolean))]
}

const texte = (over = {}) => ({
  kind: 'text', x: 12, y: 40, w: 90, lineHeight: 3.7, text: 'REF-001', size: 2.65,
  color: '#111111', align: 'left',
  font: { fontFamily: 'inherit', fontWeight: 400, italic: false },
  ...over,
})

const pageExemple = [
  { kind: 'rect', x: 0, y: 0, w: 210, h: 25, fill: '#7C5CFC' },
  texte({ y: 8, size: 6, color: '#ffffff', align: 'center', text: 'CATALOGUE', font: { fontFamily: 'inherit', fontWeight: 700, italic: false } }),
  texte(),
  texte({ y: 45, size: 2.1, color: '#4b5563', text: 'Ballotin 250 g assortiment' }),
  { kind: 'rect', x: 12, y: 52, w: 90, h: 0.3, fill: '#d1d5db' },
]

const rendre = (options = {}) => renderPdf({
  pages: [pageExemple],
  pageWidthMm: 210, pageHeightMm: 297,
  loadImage: async () => null,
  ...options,
})

describe('renderPdf', () => {
  it('produit un PDF valide', async () => {
    const octets = await rendre()
    expect(octets.length).toBeGreaterThan(500)
    expect(new TextDecoder().decode(octets.slice(0, 5))).toBe('%PDF-')
  })

  it('crée une page par entrée, à la bonne taille', async () => {
    const octets = await renderPdf({
      pages: [pageExemple, pageExemple, pageExemple],
      pageWidthMm: 210, pageHeightMm: 297,
      loadImage: async () => null,
    })
    const relu = await PDFDocument.load(octets)
    expect(relu.getPageCount()).toBe(3)

    const { width, height } = relu.getPage(0).getSize()
    expect(width).toBeCloseTo(mmToPt(210), 1)
    expect(height).toBeCloseTo(mmToPt(297), 1)
  })

  it('respecte un format personnalisé en paysage', async () => {
    const octets = await renderPdf({
      pages: [[]], pageWidthMm: 320, pageHeightMm: 240, loadImage: async () => null,
    })
    const { width, height } = (await PDFDocument.load(octets)).getPage(0).getSize()
    expect(width).toBeCloseTo(mmToPt(320), 1)
    expect(height).toBeCloseTo(mmToPt(240), 1)
  })

  it('inscrit le titre du projet dans les métadonnées', async () => {
    const octets = await rendre({ metadata: { title: 'Catalogue chocolats' } })
    const relu = await PDFDocument.load(octets)
    expect(relu.getTitle()).toBe('Catalogue chocolats')
  })

  it('écrit le texte en vectoriel, pas en image', async () => {
    // Toute la différence avec l'ancien export : la page référence des polices
    // et aucune image. Auparavant c'était l'inverse — une photo par page,
    // texte compris.
    const relu = await PDFDocument.load(await rendre())
    expect(policesEmbarquees(relu.getPage(0))).not.toHaveLength(0)
    expect(ressource(relu.getPage(0), 'XObject')?.keys() ?? []).toHaveLength(0)
  })

  it('embarque une police par variante, pas une par bloc', async () => {
    const pages = [[
      texte(),
      texte({ y: 50 }),
      texte({ y: 60, font: { fontFamily: 'inherit', fontWeight: 700, italic: false } }),
    ]]
    const octets = await renderPdf({ pages, pageWidthMm: 210, pageHeightMm: 297, loadImage: async () => null })
    const relu = await PDFDocument.load(octets)
    expect(policesEmbarquees(relu.getPage(0))).toHaveLength(2) // normale et grasse
  })

  it('ne plante pas sur une page vide', async () => {
    const octets = await renderPdf({ pages: [[]], pageWidthMm: 210, pageHeightMm: 297, loadImage: async () => null })
    expect((await PDFDocument.load(octets)).getPageCount()).toBe(1)
  })

  it('ignore une primitive de taille nulle plutôt que de la dessiner', async () => {
    const octets = await renderPdf({
      pages: [[{ kind: 'rect', x: 10, y: 10, w: 0, h: 5, fill: '#000000' }]],
      pageWidthMm: 210, pageHeightMm: 297, loadImage: async () => null,
    })
    expect((await PDFDocument.load(octets)).getPageCount()).toBe(1)
  })

  it('poursuit l\'export quand une image est introuvable', async () => {
    // Une photo produit manquante ne doit pas faire échouer tout le catalogue.
    const octets = await renderPdf({
      pages: [[...pageExemple, { kind: 'image', x: 10, y: 60, w: 50, h: 40, src: 'absente.jpg', fit: 'contain' }]],
      pageWidthMm: 210, pageHeightMm: 297,
      loadImage: async () => { throw new Error('introuvable') },
    })
    expect((await PDFDocument.load(octets)).getPageCount()).toBe(1)
  })

  it('retombe sur une police standard si le projet en fournit une illisible', async () => {
    // Une police en woff2 ne peut pas être embarquée dans un PDF : l'export
    // doit continuer avec un substitut plutôt qu'échouer.
    const octets = await renderPdf({
      pages: [[texte({ font: { fontFamily: 'T StarPro', fontWeight: 400, italic: false } })]],
      pageWidthMm: 210, pageHeightMm: 297, loadImage: async () => null,
      customFonts: [{ name: 'T StarPro', src: 'data:font/woff2;base64,AAAA' }],
    })
    expect((await PDFDocument.load(octets)).getPageCount()).toBe(1)
  })
})
