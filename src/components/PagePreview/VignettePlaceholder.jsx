import useCatalogStore from '../../store/catalogStore'
import { mmToCssPx } from '../../utils/layoutCalculator'
import { AnyBlock } from '../VignetteBuilder/blockRenderer'
import { buildImageUrl } from '../../utils/imageUrl'
import { useLocalImageRefresh } from '../../hooks/useLocalImageRefresh'

/**
 * Renders one product vignette in the page preview.
 * Uses the exact same AnyBlock engine as VignetteCanvas — zero drift.
 */
export default function VignettePlaceholder({ row, vignetteW, vignetteH, zoom, index }) {
  const { vignetteBlocks, columns, imageBasePath, imageColumn, imageExtension } = useCatalogStore()
  // Re-render after local images are lazily cached
  useLocalImageRefresh(imageBasePath, index)

  const wPx = mmToCssPx(vignetteW, zoom)
  const hPx = mmToCssPx(vignetteH, zoom)
  // scale: same formula as VignetteCanvas (wPx / mmToCssPx(vignetteW, 100))
  // This ensures font sizes and padding are proportionally identical in canvas and preview.
  // Simplifies to zoom/100.
  const scale = zoom / 100

  const hasBlocks = vignetteBlocks.length > 0

  if (hasBlocks) {
    return (
      <BlockVignette
        wPx={wPx} hPx={hPx} scale={scale}
        row={row} blocks={vignetteBlocks}
        imageBasePath={imageBasePath} imageColumn={imageColumn} imageExtension={imageExtension}
      />
    )
  }

  return (
    <AutoVignette
      wPx={wPx} hPx={hPx} scale={scale}
      row={row} columns={columns} index={index}
      imageBasePath={imageBasePath} imageColumn={imageColumn} imageExtension={imageExtension}
    />
  )
}

// ─── Height estimation (mirrors blockRenderer fixed-height logic) ─────────────

function estimateBlockHeight(block, hPx, scale) {
  switch (block.type) {
    case 'text':
    case 'static': {
      const fontSize   = (block.fontSize ?? 10) * scale
      const maxLines   = block.maxLines ?? 1
      const paddingVpx = Math.round((block.paddingV ?? 2) * scale)
      return Math.ceil(fontSize * 1.4 * maxLines) + paddingVpx * 2
    }
    case 'image':
      return (block.heightPct != null ? block.heightPct / 100 : 0.5) * hPx
    case 'separator': {
      const marginV = (block.marginV ?? 2) * scale
      return Math.max(0.5, (block.thickness ?? 0.5) * scale) + marginV * 2
    }
    default:
      return 0
  }
}

// ─── Rendered from block definitions ─────────────────────────────────────────

function BlockVignette({ wPx, hPx, scale, row, blocks, imageBasePath, imageColumn, imageExtension }) {
  const allFlow = blocks.filter(b => b.position !== 'absolute' && b.visible !== false)
  const absBlocks = blocks.filter(b => b.position === 'absolute' && b.visible !== false)
  const mmToPx = (mm) => mm * scale

  // Only render flow blocks that fully fit within the vignette height.
  // Use a scale-aware safety margin: at higher export zoom (scale 2–3) the
  // accumulated sub-pixel rounding across blocks can exceed 2 px, leading to
  // the bottom of the last visible block being clipped by the container.
  const safetyMargin = Math.max(4, Math.ceil(scale * 3))
  const flowBlocks = []
  let usedH = 0
  for (const block of allFlow) {
    const bh = estimateBlockHeight(block, hPx, scale)
    if (usedH + bh > hPx - safetyMargin) break
    flowBlocks.push(block)
    usedH += bh
  }

  return (
    <div className="relative bg-white" style={{ width: wPx, height: hPx }}>

      {/* Flow blocks — no overflow clipping: each block type clips its own
          content internally, and the estimation loop above already excludes
          blocks that won't fit.  Removing the outer overflow:hidden prevents
          the last visible block from being cropped when html2canvas renders
          text a pixel or two taller than the JS estimate. */}
      <div className="flex flex-col" style={{ width: wPx }}>
        {flowBlocks.map(block => (
          <div key={block.id} className="shrink-0">
            <AnyBlock
              block={block} row={row}
              vignetteWpx={wPx} vignetteHpx={hPx} scale={scale}
              imageBasePath={imageBasePath} imageColumn={imageColumn} imageExtension={imageExtension}
            />
          </div>
        ))}
      </div>

      {/* Absolute blocks — no overflow clipping so blocks whose computed
          bottom sits a fraction of a pixel beyond the vignette boundary
          (due to rounding at different export zoom levels) are not cropped.
          Each block's own AnyBlock already handles its internal overflow. */}
      {absBlocks.map(block => (
        <div
          key={block.id}
          className="absolute"
          style={{
            left:   mmToPx(block.x ?? 0),
            top:    mmToPx(block.y ?? 0),
            width:  block.width  ? mmToPx(block.width)  : 'auto',
            height: block.height ? mmToPx(block.height) : 'auto',
          }}
        >
          <AnyBlock
            block={block} row={row}
            vignetteWpx={wPx} vignetteHpx={hPx} scale={scale}
            imageBasePath={imageBasePath} imageColumn={imageColumn} imageExtension={imageExtension}
          />
        </div>
      ))}
    </div>
  )
}

// ─── Auto-layout fallback (no blocks defined yet) ────────────────────────────

function AutoVignette({ wPx, hPx, scale, row, columns, index, imageBasePath, imageColumn, imageExtension }) {
  const imgSrc = imageColumn ? buildImageUrl(row?.[imageColumn], imageBasePath, imageExtension) : null
  const previewCols = columns.filter(c => c !== imageColumn).slice(0, 4)
  const fs = Math.max(6, Math.min(10, scale * 2.8))

  return (
    <div className="relative bg-white overflow-hidden flex flex-col border border-gray-100"
      style={{ width: wPx, height: hPx }}>

      {/* Index badge */}
      <div className="absolute top-0.5 right-0.5 z-10 bg-black/10 text-black/40 rounded px-0.5"
        style={{ fontSize: fs * 0.7 }}>#{index + 1}</div>

      {/* Image — 50% of vignette height */}
      {imgSrc && (
        <div className="w-full overflow-hidden flex items-center justify-center bg-gray-50"
          style={{ height: hPx * 0.5, flexShrink: 0 }}>
          <img src={imgSrc} alt="" className="max-w-full max-h-full object-contain"
            onError={e => { e.target.style.display = 'none' }} />
        </div>
      )}

      {/* Text fields */}
      <div className="flex-1 overflow-hidden flex flex-col" style={{ padding: Math.max(2, scale * 0.8) }}>
        {previewCols.map((col, i) => {
          const val = String(row?.[col] ?? '')
          if (!val) return null
          return (
            <div key={col} className="truncate leading-snug text-black"
              style={{ fontSize: i === 0 ? fs : fs * 0.85, fontWeight: i === 0 ? 600 : 400 }}>
              {val}
            </div>
          )
        })}
      </div>
    </div>
  )
}
