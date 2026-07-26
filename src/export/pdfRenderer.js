/**
 * Rendu PDF vectoriel des primitives de mise en page.
 *
 * Textes et formes sont dessinés en vectoriel — sélectionnables, nets à tout
 * zoom, et corrects à l'impression. Les photos produit restent en raster,
 * c'est leur nature.
 *
 * L'ancien export photographiait le rendu du navigateur : tout finissait en
 * image, texte compris. Ici, on redessine à partir du modèle, ce qui suppose
 * que le modèle décrive exactement ce que l'écran montre — d'où layoutText et
 * layoutVignette, partagés avec l'aperçu.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { mmToPt, flipY, baselineY, alignedX, parseColor, fitImage } from './pdfPrimitives'

/** Métriques de repli si la police n'en expose pas — proportions latines usuelles. */
const METRICS_DEFAUT = { ascent: 718, descent: -207, unitsPerEm: 1000 }

/** Extrait ascendante et descendante d'une police embarquée. */
function metriquesDe(font) {
  const f = font?.embedder?.font
  if (f?.ascent && f?.unitsPerEm) {
    return { ascent: f.ascent, descent: f.descent ?? -207, unitsPerEm: f.unitsPerEm }
  }
  // Polices standard : métriques exprimées pour 1000 unités par em.
  if (f?.Ascender) {
    return { ascent: f.Ascender, descent: f.Descender ?? -207, unitsPerEm: 1000 }
  }
  return METRICS_DEFAUT
}

/** Clé d'une variante de police. */
const cleFonte = ({ fontFamily, fontWeight, italic }) =>
  `${fontFamily ?? 'inherit'}|${fontWeight ?? 400}|${italic ? 'i' : 'n'}`

/**
 * Prépare les polices : une entrée par variante rencontrée dans les pages.
 * Les polices du projet sont embarquées ; le reste retombe sur une police
 * standard de graisse et d'italique approchants.
 */
async function preparerPolices(doc, pages, customFonts) {
  const parNom = new Map(customFonts.map((f) => [f.name, f]))
  const cache = new Map()

  const standard = async ({ fontWeight, italic }) => {
    const gras = Number(fontWeight ?? 400) >= 600
    if (gras && italic) return doc.embedFont(StandardFonts.HelveticaBoldOblique)
    if (gras) return doc.embedFont(StandardFonts.HelveticaBold)
    if (italic) return doc.embedFont(StandardFonts.HelveticaOblique)
    return doc.embedFont(StandardFonts.Helvetica)
  }

  for (const primitives of pages) {
    for (const p of primitives) {
      if (p.kind !== 'text') continue
      const cle = cleFonte(p.font)
      if (cache.has(cle)) continue

      const perso = parNom.get(p.font?.fontFamily)
      let font
      if (perso?.src) {
        try {
          font = await doc.embedFont(await octetsDeDataUrl(perso.src), { subset: true })
        } catch {
          // Format illisible par le PDF (woff/woff2) : on ne casse pas
          // l'export, on retombe sur une police standard.
          font = await standard(p.font)
        }
      } else {
        font = await standard(p.font)
      }
      cache.set(cle, { font, metrics: metriquesDe(font) })
    }
  }

  return cache
}

async function octetsDeDataUrl(src) {
  const reponse = await fetch(src)
  return new Uint8Array(await reponse.arrayBuffer())
}

/**
 * Produit le PDF.
 *
 * @param {object} p
 * @param {object[][]} p.pages        primitives, une entrée par page
 * @param {number} p.pageWidthMm
 * @param {number} p.pageHeightMm
 * @param {object[]} [p.customFonts]  polices du projet ({ name, src })
 * @param {(src) => Promise<{bytes, type, width, height}|null>} p.loadImage
 * @param {object} [p.metadata]       titre du document
 * @returns {Promise<Uint8Array>}
 */
export async function renderPdf({
  pages, pageWidthMm, pageHeightMm, customFonts = [], loadImage, metadata = {},
}) {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  if (metadata.title) doc.setTitle(metadata.title)
  doc.setProducer('Catalogue Builder')

  const polices = await preparerPolices(doc, pages, customFonts)
  const imagesEmbarquees = new Map()

  for (const primitives of pages) {
    const page = doc.addPage([mmToPt(pageWidthMm), mmToPt(pageHeightMm)])

    for (const p of primitives) {
      if (p.kind === 'rect') dessinerRect(page, p, pageHeightMm)
      else if (p.kind === 'text') dessinerTexte(page, p, pageHeightMm, polices)
      else if (p.kind === 'image') await dessinerImage(doc, page, p, pageHeightMm, loadImage, imagesEmbarquees)
    }
  }

  return doc.save()
}

function dessinerRect(page, p, pageHeightMm) {
  const couleur = parseColor(p.fill)
  if (!couleur || p.w <= 0 || p.h <= 0) return
  page.drawRectangle({
    x: mmToPt(p.x),
    y: flipY(p.y, p.h, pageHeightMm),
    width: mmToPt(p.w),
    height: mmToPt(p.h),
    color: rgb(couleur.r, couleur.g, couleur.b),
  })
}

function dessinerTexte(page, p, pageHeightMm, polices) {
  const entree = polices.get(cleFonte(p.font))
  if (!entree || !p.text) return

  const { font, metrics } = entree
  const taillePt = mmToPt(p.size)
  const largeurTextePt = font.widthOfTextAtSize(p.text, taillePt)
  const couleur = parseColor(p.color) ?? { r: 0, g: 0, b: 0 }

  page.drawText(p.text, {
    x: alignedX(p.x, p.w, largeurTextePt / (72 / 25.4), p.align),
    y: baselineY(p.y, p.lineHeight, p.size, metrics, pageHeightMm),
    size: taillePt,
    font,
    color: rgb(couleur.r, couleur.g, couleur.b),
  })
}

async function dessinerImage(doc, page, p, pageHeightMm, loadImage, cache) {
  if (!loadImage || p.w <= 0 || p.h <= 0) return

  let embarquee = cache.get(p.src)
  if (embarquee === undefined) {
    const chargee = await loadImage(p.src).catch(() => null)
    embarquee = chargee ? await embarquer(doc, chargee) : null
    cache.set(p.src, embarquee)
  }
  if (!embarquee) return

  const { x, y, w, h } = fitImage({
    boxW: p.w, boxH: p.h,
    naturalW: embarquee.width, naturalH: embarquee.height,
    fit: p.fit,
  })

  page.drawImage(embarquee.image, {
    x: mmToPt(p.x + x),
    y: flipY(p.y + y, h, pageHeightMm),
    width: mmToPt(w),
    height: mmToPt(h),
  })
}

async function embarquer(doc, { bytes, type }) {
  try {
    const image = type === 'image/png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
    return { image, width: image.width, height: image.height }
  } catch {
    return null
  }
}
