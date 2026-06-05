import { useMemo } from 'react'
import { mmToCssPx, calcVignetteDimensions } from '../../utils/layoutCalculator'
import useCatalogStore from '../../store/catalogStore'
import VignettePlaceholder from './VignettePlaceholder'
import { AnyBlock } from '../VignetteBuilder/blockRenderer'

/**
 * Renders one page of the catalogue at the given zoom level.
 */
export default function PageCanvas({ pageData, zoom, totalPages = 1, showGuides = true }) {
  const { grid, header, footer, headerBlocks, footerBlocks, imageBasePath, imageColumn, imageExtension } = useCatalogStore()

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
  const gutterHpx = mmToCssPx(grid.gutterH, zoom)
  const gutterVpx = mmToCssPx(grid.gutterV, zoom)

  const { rows: rowItems, groupLabel, index: pageIndex } = pageData

  // Build the grid cells
  const cells = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.columns; c++) {
      cells.push({ row: r, col: c, product: rowItems[r * grid.columns + c] ?? null })
    }
  }

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
              {/* Logo */}
              {header.logo?.enabled && header.logo?.src && (
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
                    src={header.logo.src}
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

      {/* ── Vignette grid ────────────────────────────────────── */}
      <div
        className="absolute"
        style={{
          left: marginLeftPx,
          top: marginTopPx + headerHpx + (header.enabled && header.rule?.enabled ? (header.rule?.thickness ?? 1) * (zoom / 100) : 0),
          width: pageWpx - marginLeftPx - marginRightPx,
          height: pageHpx - marginTopPx - marginBottomPx - headerHpx - footerHpx,
          display: 'grid',
          gridTemplateColumns: `repeat(${grid.columns}, 1fr)`,
          gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
          gap: `${gutterVpx}px ${gutterHpx}px`,
        }}
      >
        {cells.map(({ row: r, col: c, product }, i) => (
          <div key={`${r}-${c}`} className="overflow-hidden">
            {product ? (
              <VignettePlaceholder
                row={product}
                vignetteW={dims.vignetteWidth}
                vignetteH={dims.vignetteHeight}
                zoom={zoom}
                index={pageIndex * (grid.columns * grid.rows) + i}
              />
            ) : (
              <div className="w-full h-full" /> // empty cell
            )}
          </div>
        ))}
      </div>

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
