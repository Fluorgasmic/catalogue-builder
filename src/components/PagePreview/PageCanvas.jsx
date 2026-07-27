import { useMemo } from 'react'
import { Scissors } from 'lucide-react'
import { mmToCssPx, calcVignetteDimensions } from '../../utils/layoutCalculator'
import useCatalogStore from '../../store/catalogStore'
import VignettePlaceholder from './VignettePlaceholder'
import { AnyBlock } from '../VignetteBuilder/blockRenderer'
import { blockImageSrc } from '../../utils/assetUrl'
import { gridCells, blocksForSlot } from '../../layout/pageLayout'
import { breakKey } from '../../hooks/usePagination'

/**
 * Renders one page of the catalogue at the given zoom level.
 */
export default function PageCanvas({ pageData, zoom, totalPages = 1, showGuides = true, interactive = false }) {
  const { grid, header, footer, headerBlocks, footerBlocks, imageBasePath, imageColumn, imageExtension } = useCatalogStore()
  // Contrôles d'édition : jamais rendus dans l'export, qui monte PageCanvas
  // hors écran sans `interactive`.
  const coupures = useCatalogStore((s) => s.pageBreaks)
  const breakKeyColumn = useCatalogStore((s) => s.breakKeyColumn)
  const columns = useCatalogStore((s) => s.columns)
  const togglePageBreak = useCatalogStore((s) => s.togglePageBreak)
  const vignetteBlocks = useCatalogStore((s) => s.vignetteBlocks)
  const vignetteLayouts = useCatalogStore((s) => s.vignetteLayouts)

  const logoSrc = blockImageSrc({ assetName: header.logo?.assetName, legacySrc: header.logo?.src })

  const dims = useMemo(
    () => calcVignetteDimensions(grid, header, footer),
    [grid, header, footer]
  )

  const pageWpx = mmToCssPx(dims.pageW, zoom)
  const pageHpx = mmToCssPx(dims.pageH, zoom)
  const marginTopPx = mmToCssPx(grid.margins.top, zoom)
  const marginBottomPx = mmToCssPx(grid.margins.bottom, zoom)
  const marginLeftPx = mmToCssPx(grid.margins.left, zoom)
  const marginRightPx = mmToCssPx(grid.margins.right, zoom)
  const headerHpx = mmToCssPx(dims.headerH, zoom)
  const footerHpx = mmToCssPx(dims.footerH, zoom)
  const headerContentHpx = header.enabled ? mmToCssPx(header.height ?? 18, zoom) : 0
  const footerContentHpx = footer.enabled ? mmToCssPx(footer.height ?? 8, zoom) : 0
  // Own padding for header/footer (can override page margins)
  const headerPadLeft  = header.paddingLeft  != null ? mmToCssPx(header.paddingLeft,  zoom) : marginLeftPx
  const headerPadRight = header.paddingRight != null ? mmToCssPx(header.paddingRight, zoom) : marginRightPx
  const footerPadLeft  = footer.paddingLeft  != null ? mmToCssPx(footer.paddingLeft,  zoom) : marginLeftPx
  const footerPadRight = footer.paddingRight != null ? mmToCssPx(footer.paddingRight, zoom) : marginRightPx
  const { rows: rowItems, groupLabel, index: pageIndex, template } = pageData

  // Emplacements du gabarit de la page — la même fonction que celle qui sert
  // à l'export, pour que l'écran et le PDF ne puissent pas diverger.
  const emplacements = useMemo(
    () => gridCells(grid, dims, template),
    [grid, dims, template],
  )

  return (
    <div
      className="relative bg-white page-shadow shrink-0"
      style={{ width: pageWpx, height: pageHpx }}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      {header.enabled && dims.headerH > 0 && (
        headerBlocks.length > 0 ? (
          /* Block-based header */
          <HeaderBlocksRenderer
            blocks={headerBlocks}
            top={marginTopPx}
            height={headerContentHpx}
            pageWpx={pageWpx}
            padLeft={headerPadLeft}
            padRight={headerPadRight}
            bgColor={header.bgColor}
            zoom={zoom}
            pageIndex={pageIndex}
            totalPages={totalPages}
            groupLabel={groupLabel}
            imageBasePath={imageBasePath}
            imageColumn={imageColumn}
            imageExtension={imageExtension}
          />
        ) : (
          /* Legacy structured header */
          <>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: marginTopPx,
                minHeight: headerContentHpx,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: headerPadLeft,
                paddingRight: headerPadRight,
                backgroundColor: header.bgColor === 'transparent' ? undefined : header.bgColor,
              }}
            >
              {/* Logo : référence d'asset, avec repli sur le base64 hérité */}
              {header.logo?.enabled && logoSrc && (
                <div style={{
                  width: mmToCssPx(header.logo.width ?? 24, zoom),
                  height: mmToCssPx(header.logo.height ?? 10, zoom),
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  marginRight: header.logo.position === 'right' ? 0 : mmToCssPx(2, zoom),
                  marginLeft: header.logo.position === 'right' ? 'auto' : 0,
                  order: header.logo.position === 'right' ? 9 : 0,
                }}>
                  <img
                    src={logoSrc}
                    alt="Logo"
                    crossOrigin="anonymous"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </div>
              )}

              {/* Title + secondary text */}
              {header.title?.enabled && (
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div
                    style={{
                      fontFamily: header.title.fontFamily && header.title.fontFamily !== 'inherit' ? header.title.fontFamily : undefined,
                      fontSize: (header.title.fontSize ?? 14) * (zoom / 100),
                      fontWeight: header.title.fontWeight ?? 'bold',
                      color: header.title.color ?? '#111',
                      textAlign: header.title.align ?? 'left',
                      lineHeight: 1.5,
                      whiteSpace: 'nowrap',
                      overflow: 'visible',
                    }}
                  >
                    {groupLabel || header.title.staticText || 'En-tête'}
                  </div>
                  {header.secondaryText?.enabled && header.secondaryText?.text && (
                    <div
                      style={{
                        fontFamily: header.secondaryText.fontFamily && header.secondaryText.fontFamily !== 'inherit' ? header.secondaryText.fontFamily : undefined,
                        fontSize: (header.secondaryText.fontSize ?? 9) * (zoom / 100),
                        color: header.secondaryText.color ?? '#9ca3af',
                        textAlign: header.title.align ?? 'left',
                        lineHeight: 1.5,
                        whiteSpace: 'nowrap',
                        overflow: 'visible',
                      }}
                    >
                      {header.secondaryText.text}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Header rule (legacy only) */}
            {header.rule?.enabled && (
              <div
                className="absolute left-0 right-0"
                style={{
                  top: marginTopPx + headerContentHpx,
                  height: (header.rule.thickness ?? 1) * (zoom / 100),
                  marginLeft: marginLeftPx,
                  marginRight: marginRightPx,
                  backgroundColor: header.rule.color ?? '#7C5CFC',
                }}
              />
            )}
          </>
        )
      )}

      {/* ── Vignettes, aux emplacements du gabarit ───────────────
          Les mêmes emplacements que ceux du PDF : un seul calcul, deux
          rendus. Une grille CSS `repeat()` ne saurait de toute façon pas
          exprimer un gabarit à bandes de hauteurs différentes. */}
      {emplacements.map((place, i) => {
        const product = rowItems[i]
        if (!product) return null
        const cle = interactive ? breakKey(product, breakKeyColumn, columns) : null
        const coupeIci = cle != null && coupures.includes(cle)
        return (
          <div
            key={i}
            className={`absolute ${interactive ? 'group' : ''}`}
            style={{
              left: mmToCssPx(place.x, zoom),
              top: mmToCssPx(place.y, zoom),
              width: mmToCssPx(place.w, zoom),
              height: mmToCssPx(place.h, zoom),
            }}
          >
            <VignettePlaceholder
              row={product}
              vignetteW={place.w}
              vignetteH={place.h}
              zoom={zoom}
              index={pageIndex * emplacements.length + i}
              blocks={blocksForSlot(place, vignetteBlocks, vignetteLayouts)}
            />

            {/* Saut de page forcé : la coupure est attachée au produit, donc
                elle le suit si des articles sont ajoutés avant lui. */}
            {cle != null && (
              <button
                onClick={() => togglePageBreak(cle)}
                title={coupeIci
                  ? 'Retirer le saut de page avant ce produit'
                  : 'Commencer une nouvelle page à ce produit'}
                className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center
                  shadow transition-opacity z-10
                  ${coupeIci
                    ? 'bg-accent text-white opacity-100'
                    : 'bg-surface-3 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-100'}`}
              >
                <Scissors size={10} />
              </button>
            )}

            {/* Trait rappelant qu'une coupure démarre ici */}
            {coupeIci && (
              <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-accent rounded-full" />
            )}
          </div>
        )
      })}

      {/* ── Footer ───────────────────────────────────────────── */}
      {footer.enabled && dims.footerH > 0 && (
        footerBlocks.length > 0 ? (
          /* Block-based footer */
          <FooterBlocksRenderer
            blocks={footerBlocks}
            bottom={marginBottomPx}
            height={footerContentHpx}
            pageWpx={pageWpx}
            padLeft={footerPadLeft}
            padRight={footerPadRight}
            bgColor={footer.bgColor}
            zoom={zoom}
            pageIndex={pageIndex}
            totalPages={totalPages}
            groupLabel={groupLabel}
            imageBasePath={imageBasePath}
            imageColumn={imageColumn}
            imageExtension={imageExtension}
          />
        ) : (
          /* Legacy structured footer */
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: marginBottomPx,
              minHeight: footerContentHpx,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: footerPadLeft,
              paddingRight: footerPadRight,
            }}
          >
            <FooterContent footer={footer} pageIndex={pageIndex} totalPages={totalPages} zoom={zoom} pageData={pageData} />
          </div>
        )
      )}

      {/* ── Margin guides (light overlay) ────────────────────── */}
      {showGuides && <MarginGuides
        pageWpx={pageWpx}
        pageHpx={pageHpx}
        ml={marginLeftPx}
        mr={marginRightPx}
        mt={marginTopPx}
        mb={marginBottomPx}
      />}
    </div>
  )
}

function FooterContent({ footer, pageIndex, totalPages, zoom, pageData }) {
  const { pageNumber, conditionalNotes = [], bgColor } = footer

  // Check conditional notes
  const activeNotes = conditionalNotes.filter(note => {
    if (!note.column || !note.text) return false
    const rows = pageData?.rows ?? []
    return rows.some(row => {
      const val = String(row?.[note.column] ?? '')
      if (note.operator === '==')       return val === note.value
      if (note.operator === '!=')       return val !== note.value
      if (note.operator === 'contains') return val.includes(note.value ?? '')
      if (note.operator === '!empty')   return val.trim() !== ''
      return false
    })
  })

  const text = pageNumber?.enabled
    ? (pageNumber.format ?? 'Page {n} / {total}')
        .replace('{n}', pageIndex + 1)
        .replace('{total}', totalPages)
    : null

  const justify = { left: 'flex-start', center: 'center', right: 'flex-end' }[pageNumber?.position ?? 'center']

  return (
    <div className="flex-1 flex items-center gap-3">
      {/* Page number */}
      {text && (
        <div className="flex" style={{ justifyContent: justify, flex: 1 }}>
          <span style={{
            fontFamily: pageNumber.fontFamily && pageNumber.fontFamily !== 'inherit' ? pageNumber.fontFamily : undefined,
            fontSize: (pageNumber.fontSize ?? 8) * (zoom / 100),
            color: pageNumber.color ?? '#9ca3af',
          }}>
            {text}
          </span>
        </div>
      )}

      {/* Conditional notes */}
      {activeNotes.map(note => (
        <span key={note.id} style={{
          fontSize: 7 * (zoom / 100),
          color: '#6b7280',
          fontStyle: 'italic',
        }}>
          {note.text}
        </span>
      ))}
    </div>
  )
}

function MarginGuides({ pageWpx, pageHpx, ml, mr, mt, mb }) {
  // Subtle margin indicator lines (always shown in preview mode as faint blue)
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.3 }}>
      {/* Top margin */}
      <div className="absolute left-0 right-0 border-b border-blue-400/30" style={{ top: mt }} />
      {/* Bottom margin */}
      <div className="absolute left-0 right-0 border-t border-blue-400/30" style={{ bottom: mb }} />
      {/* Left margin */}
      <div className="absolute top-0 bottom-0 border-r border-blue-400/30" style={{ left: ml }} />
      {/* Right margin */}
      <div className="absolute top-0 bottom-0 border-l border-blue-400/30" style={{ right: mr }} />
    </div>
  )
}

// ─── Block-based header/footer renderers ─────────────────────────────────────

function processTemplateVars(blocks, pageIndex, totalPages, groupLabel) {
  return blocks
    .filter(b => b.visible !== false)
    .map(b => {
      if (b.type === 'static' && b.staticText) {
        return {
          ...b,
          staticText: b.staticText
            .replace(/\{page\}/g, String(pageIndex + 1))
            .replace(/\{total\}/g, String(totalPages))
            .replace(/\{group\}/g, groupLabel ?? ''),
        }
      }
      return b
    })
}

function HeaderBlocksRenderer({ blocks, top, height, pageWpx, padLeft, padRight, bgColor, zoom, pageIndex, totalPages, groupLabel, imageBasePath, imageColumn, imageExtension }) {
  const scale = zoom / 100
  const processed = processTemplateVars(blocks, pageIndex, totalPages, groupLabel)

  // Free-form: blocks have x, y, w, h in mm — render with absolute positioning
  const hasFreeForm = processed.some(b => b.x != null)

  if (hasFreeForm) {
    return (
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top,
          height,
          backgroundColor: bgColor === 'transparent' ? undefined : bgColor,
        }}
      >
        {processed.map(block => {
          const bx = mmToCssPx(block.x ?? 0, zoom)
          const by = mmToCssPx(block.y ?? 0, zoom)
          const bw = block.w != null ? mmToCssPx(block.w, zoom) : (pageWpx - padLeft - padRight)
          const bh = block.h != null ? mmToCssPx(block.h, zoom) : undefined

          return (
            <div key={block.id} style={{
              position: 'absolute',
              left: bx,
              top: by,
              width: bw,
              height: bh ?? 'auto',
              // pas d'overflow:hidden : un texte légèrement plus haut que la
              // boîte du bloc (police à grandes métriques) ne doit pas être rasé
            }}>
              <AnyBlock
                block={block}
                row={{}}
                vignetteWpx={bw}
                vignetteHpx={bh ?? height}
                scale={scale}
                imageBasePath={imageBasePath}
                imageColumn={imageColumn}
                imageExtension={imageExtension}
              />
            </div>
          )
        })}
      </div>
    )
  }

  // Legacy flow layout (blocks without x/y/w/h)
  const contentW = pageWpx - padLeft - padRight
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top,
        minHeight: height,
        overflow: 'hidden',
        backgroundColor: bgColor === 'transparent' ? undefined : bgColor,
        paddingLeft: padLeft,
        paddingRight: padRight,
      }}
    >
      <div className="flex flex-col">
        {processed.map(block => (
          <div key={block.id} className="shrink-0">
            <AnyBlock
              block={block}
              row={{}}
              vignetteWpx={contentW}
              vignetteHpx={height}
              scale={scale}
              imageBasePath={imageBasePath}
              imageColumn={imageColumn}
              imageExtension={imageExtension}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function FooterBlocksRenderer({ blocks, bottom, height, pageWpx, padLeft, padRight, bgColor, zoom, pageIndex, totalPages, groupLabel, imageBasePath, imageColumn, imageExtension }) {
  const scale = zoom / 100
  const processed = processTemplateVars(blocks, pageIndex, totalPages, groupLabel)

  // Free-form: blocks have x, y, w, h in mm — render with absolute positioning
  const hasFreeForm = processed.some(b => b.x != null)

  if (hasFreeForm) {
    return (
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom,
          height,
          backgroundColor: bgColor === 'transparent' ? undefined : bgColor,
        }}
      >
        {processed.map(block => {
          const bx = mmToCssPx(block.x ?? 0, zoom)
          const by = mmToCssPx(block.y ?? 0, zoom)
          const bw = block.w != null ? mmToCssPx(block.w, zoom) : (pageWpx - padLeft - padRight)
          const bh = block.h != null ? mmToCssPx(block.h, zoom) : undefined

          return (
            <div key={block.id} style={{
              position: 'absolute',
              left: bx,
              top: by,
              width: bw,
              height: bh ?? 'auto',
              // pas d'overflow:hidden : un texte légèrement plus haut que la
              // boîte du bloc (police à grandes métriques) ne doit pas être rasé
            }}>
              <AnyBlock
                block={block}
                row={{}}
                vignetteWpx={bw}
                vignetteHpx={bh ?? height}
                scale={scale}
                imageBasePath={imageBasePath}
                imageColumn={imageColumn}
                imageExtension={imageExtension}
              />
            </div>
          )
        })}
      </div>
    )
  }

  // Legacy flow layout (blocks without x/y/w/h)
  const contentW = pageWpx - padLeft - padRight
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        minHeight: height,
        overflow: 'hidden',
        backgroundColor: bgColor === 'transparent' ? undefined : bgColor,
        paddingLeft: padLeft,
        paddingRight: padRight,
      }}
    >
      <div className="flex flex-col">
        {processed.map(block => (
          <div key={block.id} className="shrink-0">
            <AnyBlock
              block={block}
              row={{}}
              vignetteWpx={contentW}
              vignetteHpx={height}
              scale={scale}
              imageBasePath={imageBasePath}
              imageColumn={imageColumn}
              imageExtension={imageExtension}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
