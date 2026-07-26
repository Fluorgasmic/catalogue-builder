import { describe, it, expect } from 'vitest'
import { PDFDocument, PDFName, decodePDFRawStream } from 'pdf-lib'
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

/** Blocs BT…ET du flux de contenu d'une page — un par texte dessiné. */
function blocsDeTexte(page) {
  const contenu = page.node.Contents()
  const flux = contenu.asArray
    ? contenu.asArray().map((ref) => page.node.context.lookup(ref))
    : [contenu]
  const brut = flux
    .map((f) => new TextDecoder('latin1').decode(decodePDFRawStream(f).decode()))
    .join('\n')
  return brut.split('BT').slice(1).map((b) => b.split('ET')[0])
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

  it('donne à chaque texte sa propre sélection de police', async () => {
    // Invariant : sans opérateur Tf dans son bloc, un texte figure dans le
    // fichier mais aucun lecteur ne l'affiche.
    //
    // Constaté en conditions réelles avec des valeurs à dix-sept décimales
    // issues des mesures du navigateur : quatre textes sur neuf sortaient sans
    // Tf, une composante de couleur s'étant soudée à l'opérateur suivant.
    // Borner la précision des nombres l'a résolu — mais ce test ne reproduit
    // PAS la panne sous Node, même avec les valeurs exactes du cas réel. Le
    // déclencheur tient donc à l'environnement, et le mécanisme reste à
    // confirmer : ce test garde l'invariant, il ne garde pas la régression.
    // Trois vignettes de trois textes, avec les valeurs exactes du cas réel :
    // le débordement ne se manifeste qu'une fois les opérateurs accumulés.
    const gras = { fontFamily: 'inherit', fontWeight: 700, italic: false }
    const normal = { fontFamily: 'inherit', fontWeight: 400, italic: false }
    const vignette = (x, y) => [
      texte({ x, y, w: 90.48999999999999, size: 2.9104166666666664, color: '#111111', font: gras, text: 'CHO-001' }),
      texte({ x, y: y + 5.833333333333333, w: 90.48999999999999, size: 2.1166666666666667, color: '#4b5563', font: normal, text: 'Ballotin 250 g assortiment maison' }),
      texte({ x, y: y + 12.170833333333333, w: 90.48999999999999, size: 3.1750000000000003, color: '#7C5CFC', font: gras, text: '18,90 €' }),
    ]
    const octets = await renderPdf({
      pages: [[
        ...vignette(12.700000000000001, 34.33333333333333),
        ...vignette(108.19000000000001, 34.33333333333333),
        ...vignette(12.700000000000001, 157.44166666666666),
      ]],
      pageWidthMm: 210, pageHeightMm: 297, loadImage: async () => null,
    })

    const blocs = blocsDeTexte((await PDFDocument.load(octets)).getPage(0))
    expect(blocs).toHaveLength(9)
    // Chaque bloc doit porter sa propre sélection de police : sans elle, le
    // texte est présent dans le fichier mais aucun lecteur ne l'affiche.
    const sansPolice = blocs.filter((b) => !/\/\S+\s+[\d.]+\s+Tf/.test(b))
    expect(sansPolice).toHaveLength(0)
  })

  it('déclare les boîtes d\'impression attendues par le façonnier', async () => {
    // Sans TrimBox ni BleedBox, l'imprimeur ne peut que deviner d'après les
    // traits où couper et jusqu'où le fond perdu s'étend.
    const octets = await rendre({ prepress: { bleed: 3, cropMarks: true, registration: true } })
    const page = (await PDFDocument.load(octets)).getPage(0)

    const enMm = (v) => v / mmToPt(1)
    expect(enMm(page.getTrimBox().width)).toBeCloseTo(210, 1)
    expect(enMm(page.getTrimBox().height)).toBeCloseTo(297, 1)
    expect(enMm(page.getBleedBox().width)).toBeCloseTo(216, 1)   // 210 + 3 + 3
    expect(enMm(page.getBleedBox().height)).toBeCloseTo(303, 1)
    // Le support réserve en plus la place des traits.
    expect(enMm(page.getMediaBox().width)).toBeGreaterThan(216)
  })

  it('laisse le support au format fini quand le prépresse est désactivé', async () => {
    const page = (await PDFDocument.load(await rendre())).getPage(0)
    expect(page.getMediaBox().width).toBeCloseTo(mmToPt(210), 1)
    expect(page.getMediaBox().height).toBeCloseTo(mmToPt(297), 1)
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
