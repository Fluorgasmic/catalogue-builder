/**
 * Shared block rendering logic.
 * Used by both VignetteCanvas (editor) and VignettePlaceholder (page preview).
 *
 * All sizes are expressed relative to vignette dimensions so the layout
 * adapts automatically when the grid changes.
 */
import { buildImageUrl } from '../../utils/imageUrl'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a block dimension to CSS pixels.
 *  - If value ends with '%', treat as % of the reference (vignettePx).
 *  - Otherwise treat as mm and convert via zoom.
 */
export function dimToPx(value, vignettePx, mmToCssPxFn) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.endsWith('%')) {
    return (parseFloat(value) / 100) * vignettePx
  }
  return mmToCssPxFn(value)
}

/** Clamp image height so it never exceeds the vignette height. */
export function resolveImageHeight(block, vignetteHpx) {
  // New % system
  if (block.heightPct != null) return (block.heightPct / 100) * vignetteHpx
  // Legacy mm (convert, then cap at 90% of vignette)
  if (block.height != null && block.heightPx == null) {
    // block.height is in mm — caller must pass mmScale (px/mm at current zoom)
    // We expose heightPx for pre-computed value
  }
  if (block.heightPx != null) return Math.min(block.heightPx, vignetteHpx * 0.9)
  // Default: 50% of vignette height
  return vignetteHpx * 0.5
}

// ─── Missing image placeholder ───────────────────────────────────────────────

function MissingImagePlaceholder({ scale }) {
  const iconSize = Math.max(16, 20 * scale)
  const fontSize = Math.max(6, 7 * scale)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 * scale, color: '#d1d5db' }}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
        <line x1="3" y1="3" x2="21" y2="21" stroke="#ef4444" strokeWidth="2" />
      </svg>
      <span style={{ fontSize, color: '#d1d5db' }}>Image manquante</span>
    </div>
  )
}

// ─── Block renderers ──────────────────────────────────────────────────────────

export function TextBlockContent({ block, row, vignetteWpx, vignetteHpx, scale }) {
  // Build display content — with optional prefix/suffix for mapped blocks
  const rawContent = block.type === 'static'
    ? (block.staticText ?? '')
    : (block.columns ?? [])
        .map(c => String(row?.[c] ?? (row ? '' : `{${c}}`)))
        .join(block.separator ?? ' ')

  const prefix  = block.prefix ?? ''
  const suffix  = block.suffix ?? ''
  const content = rawContent ? `${prefix}${rawContent}${suffix}` : ''

  const fontSize   = (block.fontSize ?? 10) * scale
  const maxLines   = block.maxLines ?? 1
  const paddingVpx = Math.round((block.paddingV ?? 2) * scale)
  const paddingHpx = Math.round((block.paddingH ?? 3) * scale)
  const LINE_H     = 1.4
  // Round to integer pixels: eliminates sub-pixel accumulation drift between
  // the JS height estimator and actual CSS rendering across multiple blocks.
  const textH      = Math.ceil(fontSize * LINE_H * maxLines)
  const blockH     = textH + paddingVpx * 2

  const hasBg       = block.bgColor && block.bgColor !== 'transparent'
  const borderRadius = hasBg ? (block.bgBorderRadius ?? 0) * scale : 0
  const widthMode   = block.widthMode ?? 'full'

  // Vertical paint room for fonts whose glyphs exceed the 1.4em line box
  // (common with custom display fonts): without it, the fixed-height clip box
  // shaves descenders and letter bottoms. Single-line only — on multi-line
  // blocks extra room would reveal the top of the line after maxLines.
  // The layout footprint stays exactly blockH; only the clip box grows.
  const overshoot = (block.maxLines ?? 1) === 1 ? Math.ceil(fontSize * 0.45) : 0

  // ── Vertical alignment ──
  const vAlign = block.vAlign ?? 'top'

  // For single-line center alignment: set line-height = blockH (in px).
  // The browser auto-centers the text within the line box. Single div,
  // no nesting — fully html2canvas-safe (no nested overflow:hidden).
  const isCenterSingleLine = maxLines === 1 && vAlign === 'center'

  let padTop = paddingVpx
  let padBot = paddingVpx
  if (isCenterSingleLine) {
    // line-height trick handles centering — no vertical padding needed
    padTop = 0
    padBot = 0
  } else if (vAlign === 'top') {
    padTop = Math.round(paddingVpx * 0.4)
    padBot = paddingVpx * 2 - padTop
  } else if (vAlign === 'bottom') {
    padBot = Math.round(paddingVpx * 0.4)
    padTop = paddingVpx * 2 - padBot
  }
  // center multi-line: padTop = padBot = paddingVpx → symmetric

  const displayContent = content || (
    <span style={{ color: '#ccc', fontStyle: 'italic' }}>
      {block.type === 'static' ? 'Texte vide' : '(colonne non mappee)'}
    </span>
  )

  // ── Single-div base style — html2canvas-safe (no nested wrappers) ──
  const baseStyle = {
    fontFamily:      block.fontFamily && block.fontFamily !== 'inherit' ? block.fontFamily : undefined,
    fontSize,
    fontWeight:      block.fontWeight ?? 400,
    fontStyle:       block.italic ? 'italic' : 'normal',
    color:           block.color ?? '#111111',
    textAlign:       block.align ?? 'left',
    lineHeight:      isCenterSingleLine ? `${blockH}px` : LINE_H,
    whiteSpace:      maxLines === 1 ? 'nowrap' : 'normal',
    wordBreak:       maxLines > 1 ? 'break-word' : undefined,
    overflow:        'hidden',
    textOverflow:    maxLines === 1 ? 'ellipsis' : undefined,
    boxSizing:       'border-box',
  }

  // ── "Fit content" mode: inline bg wrapping text only ──────────────────
  if (widthMode === 'fit' && hasBg) {
    const justify = { left: 'flex-start', center: 'center', right: 'flex-end', justify: 'flex-start' }[block.align ?? 'left']
    return (
      <div style={{
        width: '100%', height: blockH,
        display: 'flex', justifyContent: justify,
        alignItems: vAlign === 'bottom' ? 'flex-end' : vAlign === 'center' ? 'center' : 'flex-start',
        flexShrink: 0,
      }}>
        <div style={{
          ...baseStyle,
          lineHeight: LINE_H,
          display: 'inline-block',
          maxWidth: '100%',
          paddingTop: paddingVpx,
          paddingBottom: paddingVpx,
          paddingLeft: paddingHpx,
          paddingRight: paddingHpx,
          backgroundColor: block.bgColor,
          borderRadius,
        }}>
          {displayContent}
        </div>
      </div>
    )
  }

  // ── "Full width" mode (default) ────────────────────────────────────────
  // Outer div = layout footprint (blockH) and background band.
  // Inner div = text with a clip box extended by `overshoot` above/below so
  // tall glyphs paint fully; the line box lands at the same position as a
  // single div would (top: -overshoot compensated by paddingTop +overshoot).
  return (
    <div style={{ position: 'relative', height: blockH, width: '100%', flexShrink: 0 }}>
      {hasBg && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: block.bgColor, borderRadius }} />
      )}
      <div style={{
        ...baseStyle,
        position:      'absolute',
        left:          0,
        right:         0,
        top:           -overshoot,
        height:        blockH + overshoot * 2,
        paddingTop:    padTop + overshoot,
        paddingBottom: padBot + overshoot,
        paddingLeft:   paddingHpx,
        paddingRight:  paddingHpx,
      }}>
        {displayContent}
      </div>
    </div>
  )
}

export function ImageBlockContent({ block, row, vignetteHpx, scale, imageBasePath, imageColumn, imageExtension }) {
  // Support direct src (for header/footer logo uploads)
  let src = block.directSrc ?? null
  if (!src) {
    const colVal = block.imageColumn
      ? (row?.[block.imageColumn] ?? '')
      : (row?.[imageColumn] ?? '')
    src = colVal ? buildImageUrl(colVal, imageBasePath, block.extension ?? imageExtension) : null
  }

  // Height is always % of vignette height — never overflows
  const heightPx = (block.heightPct != null ? block.heightPct / 100 : 0.5) * vignetteHpx

  return (
    <div style={{
      width: '100%',
      height: heightPx,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
      background: src ? undefined : '#f9fafb',
    }}>
      {src ? (
        <img
          src={src}
          alt=""
          crossOrigin="anonymous"
          style={{
            // maxWidth/maxHeight instead of width/height so html2canvas
            // doesn't stretch the image (it ignores object-fit).
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: block.fit ?? 'contain',
            display: 'block',
          }}
          onError={e => {
            // Replace broken image with placeholder
            const parent = e.target.parentNode
            if (parent) {
              e.target.style.display = 'none'
              // Only add placeholder if not already added
              if (!parent.querySelector('.missing-img-placeholder')) {
                const ph = document.createElement('div')
                ph.className = 'missing-img-placeholder'
                Object.assign(ph.style, {
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: `${2 * scale}px`, color: '#d1d5db',
                })
                ph.innerHTML = `<svg width="${Math.max(16, 20 * scale)}" height="${Math.max(16, 20 * scale)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/><line x1="3" y1="3" x2="21" y2="21" stroke="#ef4444" stroke-width="2"/></svg><span style="font-size:${Math.max(6, 7 * scale)}px;color:#d1d5db">Image manquante</span>`
                parent.appendChild(ph)
              }
            }
          }}
        />
      ) : (
        <MissingImagePlaceholder scale={scale} />
      )}
    </div>
  )
}

export function BadgeBlockContent({ block, row, vignetteWpx, vignetteHpx, scale, isEditor = false }) {
  const w = ((block.widthPct  ?? 15) / 100) * vignetteWpx
  const h = ((block.heightPct ?? 15) / 100) * vignetteHpx

  // No badge image yet
  if (!block.badgeSrc) {
    // In editor show placeholder, in output hide completely
    if (!isEditor) return null
    return (
      <div style={{
        width: w, height: h,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: '#fef3c7', border: '1px dashed #f59e0b',
      }}>
        <span style={{ fontSize: 6 * scale, color: '#f59e0b' }}>badge</span>
      </div>
    )
  }

  // No condition column mapped → hide in output
  if (!block.conditionColumn) {
    if (!isEditor) return null
    return (
      <BadgeImage src={block.badgeSrc} w={w} h={h} opacity={0.3} />
    )
  }

  // Evaluate condition
  const colVal  = String(row?.[block.conditionColumn] ?? '')
  const testVal = block.conditionValue ?? ''
  const match =
    block.conditionOperator === '=='       ? colVal === testVal :
    block.conditionOperator === '!='       ? colVal !== testVal :
    block.conditionOperator === 'contains' ? colVal.includes(testVal) :
    block.conditionOperator === 'notempty' ? colVal.trim() !== '' : false

  // Condition not met → hide in output, dim in editor
  if (!match) {
    if (!isEditor) return null
    return (
      <BadgeImage src={block.badgeSrc} w={w} h={h} opacity={0.2} />
    )
  }

  return (
    <BadgeImage src={block.badgeSrc} w={w} h={h} opacity={1} />
  )
}

/** Badge image wrapper — uses maxWidth/maxHeight pattern instead of
 *  width/height + objectFit, because html2canvas ignores object-fit. */
function BadgeImage({ src, w, h, opacity }) {
  return (
    <div style={{
      width: w,
      height: h,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      opacity,
    }}>
      <img
        src={src}
        alt=""
        crossOrigin="anonymous"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          display: 'block',
        }}
      />
    </div>
  )
}

export function SeparatorBlockContent({ block, vignetteWpx, scale }) {
  const marginV = (block.marginV ?? 2) * scale
  return (
    <div style={{ width: '100%', paddingTop: marginV, paddingBottom: marginV, display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: block.separatorWidth ?? '100%',
        height: Math.max(0.5, (block.thickness ?? 0.5) * scale),
        backgroundColor: block.color ?? '#e5e7eb',
        flexShrink: 0,
      }} />
    </div>
  )
}

/** Render any block by type. */
export function AnyBlock({ block, row, vignetteWpx, vignetteHpx, scale, imageBasePath, imageColumn, imageExtension, isEditor = false }) {
  switch (block.type) {
    case 'text':
    case 'static':
      return <TextBlockContent block={block} row={row} vignetteWpx={vignetteWpx} vignetteHpx={vignetteHpx} scale={scale} />
    case 'image':
      return <ImageBlockContent block={block} row={row} vignetteHpx={vignetteHpx} scale={scale} imageBasePath={imageBasePath} imageColumn={imageColumn} imageExtension={imageExtension} />
    case 'badge':
      return <BadgeBlockContent block={block} row={row} vignetteWpx={vignetteWpx} vignetteHpx={vignetteHpx} scale={scale} isEditor={isEditor} />
    case 'separator':
      return <SeparatorBlockContent block={block} vignetteWpx={vignetteWpx} scale={scale} />
    default:
      return null
  }
}
