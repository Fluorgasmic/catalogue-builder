import { useRef, useState, useCallback } from 'react'
import useCatalogStore from '../../store/catalogStore'
import { mmToCssPx, pxToMm } from '../../utils/layoutCalculator'
import { AnyBlock } from './blockRenderer'

const CANVAS_WIDTH_PX = 420  // fixed canvas display width in px

// Convert canvas px to mm at current zoom
function pxDeltaToMm(px, canvasWidthPx, vignetteWmm) {
  return (px / canvasWidthPx) * vignetteWmm
}

export default function VignetteCanvas({ dims, row, showGuides }) {
  const {
    vignetteBlocks, selectedBlockId, setSelectedBlock,
    updateBlock, imageBasePath, imageColumn, imageExtension,
  } = useCatalogStore()

  const canvasRef = useRef(null)
  const [dragState, setDragState] = useState(null)
  // dragState: { blockId, mode:'move'|'resize', handle:'se'|'e'|'s'|'sw'|'w'|'nw'|'n'|'ne',
  //              startX, startY, origX, origY, origW, origH }

  const wPx = CANVAS_WIDTH_PX
  const scale = wPx / mmToCssPx(dims.vignetteWidth, 100)  // px/mm scale at display size
  const hPx = mmToCssPx(dims.vignetteHeight, 100) * scale

  // mm ↔ px helpers at this canvas scale
  const mmToPx = (mm) => mm * scale
  const pxToMmLocal = (px) => px / scale

  // ── Drag start ────────────────────────────────────────────────────────────
  const startDrag = useCallback((e, blockId, mode, handle = null) => {
    e.stopPropagation()
    e.preventDefault()
    const block = vignetteBlocks.find(b => b.id === blockId)
    if (!block) return
    setSelectedBlock(blockId)
    setDragState({
      blockId, mode, handle,
      startX: e.clientX, startY: e.clientY,
      origX: block.x ?? 0,
      origY: block.y ?? 0,
      origW: block.width ?? pxToMmLocal(wPx),
      origH: block.height ?? pxToMmLocal(hPx),
    })
  }, [vignetteBlocks, wPx, hPx])

  // ── Mouse move ────────────────────────────────────────────────────────────
  const onMouseMove = useCallback((e) => {
    if (!dragState) return
    const dx = pxToMmLocal(e.clientX - dragState.startX)
    const dy = pxToMmLocal(e.clientY - dragState.startY)

    if (dragState.mode === 'move') {
      updateBlock(dragState.blockId, {
        x: Math.max(0, dragState.origX + dx),
        y: Math.max(0, dragState.origY + dy),
      })
    } else if (dragState.mode === 'resize') {
      const h = dragState.handle
      let newX = dragState.origX, newY = dragState.origY
      let newW = dragState.origW, newH = dragState.origH
      if (h.includes('e')) newW = Math.max(5, dragState.origW + dx)
      if (h.includes('s')) newH = Math.max(5, dragState.origH + dy)
      if (h.includes('w')) { newX = dragState.origX + dx; newW = Math.max(5, dragState.origW - dx) }
      if (h.includes('n')) { newY = dragState.origY + dy; newH = Math.max(5, dragState.origH - dy) }
      updateBlock(dragState.blockId, { x: newX, y: newY, width: newW, height: newH })
    }
  }, [dragState, pxToMmLocal, updateBlock])

  // ── Mouse up ──────────────────────────────────────────────────────────────
  const onMouseUp = useCallback(() => setDragState(null), [])

  const flowBlocks = vignetteBlocks.filter(b => b.position !== 'absolute' && b.visible !== false)
  const absBlocks  = vignetteBlocks.filter(b => b.position === 'absolute' && b.visible !== false)

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={canvasRef}
        className="relative bg-white select-none"
        style={{
          width: wPx, height: hPx, flexShrink: 0,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
          cursor: dragState ? (dragState.mode === 'move' ? 'grabbing' : 'nwse-resize') : 'default',
        }}
        onClick={() => setSelectedBlock(null)}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Guide overlay */}
        {showGuides && <GuideOverlay wPx={wPx} hPx={hPx} />}

        {/* Empty state */}
        {vignetteBlocks.length === 0 && <EmptyState wPx={wPx} hPx={hPx} />}

        {/* Flow blocks */}
        <div className="w-full flex flex-col overflow-hidden" style={{ maxHeight: hPx }}>
          {flowBlocks.map(block => (
            <FlowBlockWrapper
              key={block.id}
              block={block}
              selected={block.id === selectedBlockId}
              onSelect={(e) => { e.stopPropagation(); setSelectedBlock(block.id) }}
              onResizeStart={(e, handle) => startDrag(e, block.id, 'resize', handle)}
            >
              <AnyBlock
                block={block} row={row}
                vignetteWpx={wPx} vignetteHpx={hPx} scale={scale}
                imageBasePath={imageBasePath} imageColumn={imageColumn} imageExtension={imageExtension}
                isEditor={true}
              />
            </FlowBlockWrapper>
          ))}
        </div>

        {/* Absolute blocks */}
        {absBlocks.map(block => {
          const bx = mmToPx(block.x ?? 0)
          const by = mmToPx(block.y ?? 0)
          const bw = block.width  ? mmToPx(block.width)  : null
          const bh = block.height ? mmToPx(block.height) : null
          const selected = block.id === selectedBlockId
          return (
            <div
              key={block.id}
              className={`absolute ${selected ? 'z-30' : 'z-20'}`}
              style={{ left: bx, top: by, width: bw ?? 'auto', height: bh ?? 'auto' }}
              onClick={(e) => { e.stopPropagation(); setSelectedBlock(block.id) }}
              onMouseDown={(e) => startDrag(e, block.id, 'move')}
            >
              <SelectionFrame selected={selected} onResizeStart={(e, h) => startDrag(e, block.id, 'resize', h)}>
                <AnyBlock
                  block={block} row={row}
                  vignetteWpx={wPx} vignetteHpx={hPx} scale={scale}
                  imageBasePath={imageBasePath} imageColumn={imageColumn} imageExtension={imageExtension}
                  isEditor={true}
                />
              </SelectionFrame>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-gray-600">
        {dims.vignetteWidth.toFixed(1)} × {dims.vignetteHeight.toFixed(1)} mm
      </p>
    </div>
  )
}

// ── Flow block wrapper with edge resize handles ───────────────────────────────

function FlowBlockWrapper({ block, selected, onSelect, onResizeStart, children }) {
  return (
    <div
      className="relative group cursor-pointer shrink-0"
      onClick={onSelect}
      style={{ userSelect: 'none' }}
    >
      {/* Hover / selection ring */}
      <div className={`absolute inset-0 pointer-events-none z-10 ring-inset transition-all
        ${selected ? 'ring-2 ring-accent' : 'ring-1 ring-accent/0 group-hover:ring-accent/40'}`}
      />
      {children}

      {/* Bottom resize handle (height only) */}
      {selected && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20
                     w-3 h-1.5 bg-accent rounded-full cursor-s-resize shadow"
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, 's') }}
        />
      )}
    </div>
  )
}

// ── Absolute block selection frame with 8 resize handles ─────────────────────

const HANDLES = [
  { id: 'nw', cursor: 'nwse-resize', style: { top: -4, left: -4 } },
  { id: 'n',  cursor: 'ns-resize',   style: { top: -4, left: '50%', transform: 'translateX(-50%)' } },
  { id: 'ne', cursor: 'nesw-resize', style: { top: -4, right: -4 } },
  { id: 'e',  cursor: 'ew-resize',   style: { top: '50%', right: -4, transform: 'translateY(-50%)' } },
  { id: 'se', cursor: 'nwse-resize', style: { bottom: -4, right: -4 } },
  { id: 's',  cursor: 'ns-resize',   style: { bottom: -4, left: '50%', transform: 'translateX(-50%)' } },
  { id: 'sw', cursor: 'nesw-resize', style: { bottom: -4, left: -4 } },
  { id: 'w',  cursor: 'ew-resize',   style: { top: '50%', left: -4, transform: 'translateY(-50%)' } },
]

function SelectionFrame({ selected, onResizeStart, children }) {
  return (
    <div className="relative" style={{ cursor: selected ? 'grab' : 'pointer' }}>
      {/* Selection ring */}
      {selected && (
        <div className="absolute inset-0 ring-2 ring-accent pointer-events-none z-10" />
      )}

      {children}

      {/* Resize handles */}
      {selected && HANDLES.map(h => (
        <div
          key={h.id}
          className="absolute w-2 h-2 bg-white border-2 border-accent rounded-sm z-20"
          style={{ ...h.style, cursor: h.cursor }}
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, h.id) }}
        />
      ))}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function GuideOverlay({ wPx, hPx }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-20" style={{ opacity: 0.35 }}>
      <div className="absolute border-dashed border-blue-400/40" style={{ left: wPx/2 - 0.5, top: 0, bottom: 0, borderLeftWidth: 1 }} />
      <div className="absolute border-dashed border-blue-400/40" style={{ top: hPx/2 - 0.5, left: 0, right: 0, borderTopWidth: 1 }} />
    </div>
  )
}

function EmptyState({ wPx, hPx }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <p style={{ fontSize: Math.max(9, wPx / 18), color: '#d1d5db' }}>Vignette vide</p>
      <p style={{ fontSize: Math.max(7, wPx / 24), color: '#9ca3af' }}>← Ajoutez des blocs</p>
    </div>
  )
}
