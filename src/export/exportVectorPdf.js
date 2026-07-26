/**
 * Assemble le PDF vectoriel à partir de l'état du catalogue.
 *
 * Fait le lien entre le modèle de mise en page (layoutPage) et le rendu
 * (renderPdf) : mesure du texte avec les vraies métriques de police, et
 * résolution des images — photos produit d'un côté, visuels de mise en page
 * de l'autre.
 */

import { renderPdf } from './pdfRenderer'
import { loadImageBytes } from './loadImage'
import { layoutPage } from '../layout/pageLayout'
import { createMeasurer } from '../layout/measureText'
import { blockImageSrc } from '../utils/assetUrl'
import { buildImageUrl } from '../utils/imageUrl'

/**
 * Source d'un bloc porteur d'image, dans le même ordre que le rendu écran :
 * un visuel de mise en page l'emporte, sinon on construit l'URL de la photo
 * produit depuis la colonne liée.
 */
export function resolveBlockImage(block, row, { imageBasePath, imageColumn, imageExtension }) {
  if (block.type === 'badge') {
    return blockImageSrc({ assetName: block.assetName, legacySrc: block.badgeSrc })
  }

  const visuel = blockImageSrc({ assetName: block.assetName, legacySrc: block.directSrc })
  if (visuel) return visuel

  const colonne = block.imageColumn ?? imageColumn
  const valeur = colonne ? row?.[colonne] : null
  if (!valeur) return null
  return buildImageUrl(valeur, imageBasePath, block.extension ?? imageExtension)
}

/**
 * @param {object} p
 * @param {object[]} p.pages   pages issues de paginate()
 * @param {object} p.dims      sortie de calcVignetteDimensions
 * @param {object} p.state     état du catalogStore
 * @param {(fait: number, total: number) => void} [p.onProgress]
 * @returns {Promise<Uint8Array>}
 */
export async function exportVectorPdf({ pages, dims, state, onProgress }) {
  const {
    grid, header, footer, headerBlocks, footerBlocks, vignetteBlocks,
    imageBasePath, imageColumn, imageExtension, customFonts, projectName,
  } = state

  const contexte = { imageBasePath, imageColumn, imageExtension }
  const measurerFor = (style) => createMeasurer(style)

  const primitives = pages.map((page, i) => {
    onProgress?.(i, pages.length)
    return layoutPage({
      rows: page.rows,
      grid, header, footer, headerBlocks, footerBlocks, vignetteBlocks, dims,
      pageIndex: i,
      totalPages: pages.length,
      groupLabel: page.groupLabel ?? '',
      measurerFor,
      resolveImage: (block, row) => resolveBlockImage(block, row, contexte),
    })
  })

  return renderPdf({
    pages: primitives,
    pageWidthMm: dims.pageW,
    pageHeightMm: dims.pageH,
    customFonts: customFonts ?? [],
    loadImage: loadImageBytes,
    metadata: { title: projectName || 'Catalogue' },
  })
}

/** Polices du projet que le PDF ne saura pas embarquer — à signaler avant export. */
export function policesNonEmbarquables(customFonts = []) {
  return customFonts
    .filter((f) => /woff/i.test(f.format ?? '') || /^data:font\/woff/i.test(f.src ?? ''))
    .map((f) => f.name)
}
