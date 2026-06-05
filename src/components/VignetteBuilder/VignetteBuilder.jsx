import { useState, useMemo } from 'react'
import { Plus, Type, Image, Tag, Minus, AlignLeft, ChevronLeft, ChevronRight, Eye, EyeOff, Layers } from 'lucide-react'
import useCatalogStore from '../../store/catalogStore'
import { calcVignetteDimensions, mmToCssPx } from '../../utils/layoutCalculator'
import VignetteCanvas from './VignetteCanvas'
import BlockList from './BlockList'
import BlockEditor from './BlockEditor'
import { nanoid } from './nanoid'

// ─── Block type definitions ───────────────────────────────────────────────────

export const BLOCK_TYPES = [
  { type: 'text',      icon: Type,     label: 'Texte lié',      color: '#7C5CFC' },
  { type: 'image',     icon: Image,    label: 'Image produit',  color: '#3b82f6' },
  { type: 'static',    icon: AlignLeft,label: 'Texte statique', color: '#10b981' },
  { type: 'badge',     icon: Tag,      label: 'Badge conditionnel', color: '#f59e0b' },
  { type: 'separator', icon: Minus,    label: 'Séparateur',     color: '#6b7280' },
]

// ─── Default block props by type ──────────────────────────────────────────────

export function createBlock(type, columns) {
  const base = {
    id: nanoid(),
    type,
    position: 'flow',
    x: 0, y: 0,
    width: null, height: null,
    visible: true,
  }
  switch (type) {
    case 'text':
      // Start with NO columns — user maps them explicitly
      return { ...base, columns: [], separator: ' ', prefix: '', suffix: '', fontSize: 10, fontWeight: 400, fontFamily: 'inherit', color: '#111111', align: 'left', vAlign: 'top', italic: false, paddingH: 3, paddingV: 2, maxLines: 1, bgColor: null, bgBorderRadius: 0, widthMode: 'full' }
    case 'image':
      // heightPct: % of vignette height — adapts automatically to any grid
      return { ...base, imageColumn: null, extension: null, fit: 'contain', heightPct: 50 }
    case 'static':
      return { ...base, staticText: 'Texte libre', fontSize: 9, fontWeight: 400, fontFamily: 'inherit', color: '#666666', align: 'left', vAlign: 'top', italic: false, paddingH: 3, paddingV: 1, maxLines: 1, bgColor: null, bgBorderRadius: 0, widthMode: 'full' }
    case 'badge':
      // Badges are absolute by default — placed freely over the vignette
      return { ...base, position: 'absolute', x: 2, y: 2, badgeSrc: null, conditionColumn: columns[0] ?? null, conditionOperator: '==', conditionValue: '', widthPct: 15, heightPct: 15 }
    case 'separator':
      return { ...base, thickness: 0.5, color: '#e5e7eb', marginV: 2, separatorWidth: '100%' }
    default:
      return base
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VignetteBuilder() {
  const {
    grid, header, footer,
    vignetteBlocks, selectedBlockId, setSelectedBlock,
    addBlock, columns, rawData,
  } = useCatalogStore()

  const [previewIndex, setPreviewIndex] = useState(0)
  const [showGuides, setShowGuides] = useState(true)

  const dims = useMemo(() => calcVignetteDimensions(grid, header, footer), [grid, header, footer])
  const previewRow = rawData[previewIndex] ?? null
  const totalProducts = rawData.length

  const handleAddBlock = (type) => {
    const block = createBlock(type, columns)
    addBlock(block)
    setSelectedBlock(block.id)
  }

  const selectedBlock = vignetteBlocks.find(b => b.id === selectedBlockId) ?? null

  return (
    <div className="flex h-full overflow-hidden">

      {/* ══ Left panel — Block list ════════════════════════════ */}
      <div className="w-52 shrink-0 bg-surface-2 border-r border-surface-4 flex flex-col overflow-hidden">
        <div className="px-3 pt-4 pb-2 border-b border-surface-4">
          <p className="section-title mb-3">Ajouter un bloc</p>
          <div className="flex flex-col gap-1">
            {BLOCK_TYPES.map(({ type, icon: Icon, label, color }) => (
              <button
                key={type}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-400
                           hover:bg-surface-4 hover:text-gray-200 transition-colors text-left"
                onClick={() => handleAddBlock(type)}
              >
                <span className="p-1 rounded" style={{ backgroundColor: color + '25' }}>
                  <Icon size={11} style={{ color }} />
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Block list */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 mb-2">
            <p className="section-title">Blocs ({vignetteBlocks.length})</p>
          </div>
          <BlockList />
        </div>
      </div>

      {/* ══ Center — Canvas ════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface-1">
        {/* Canvas toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-2 border-b border-surface-4 shrink-0">

          {/* Vignette size info */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Vignette : <span className="text-gray-300 font-medium">
                {dims.vignetteWidth.toFixed(1)} × {dims.vignetteHeight.toFixed(1)} mm
              </span>
            </span>
            <span className="text-xs text-gray-600">({grid.columns}×{grid.rows} · {grid.pageFormat})</span>
          </div>

          {/* Guide toggle */}
          <button
            className={`btn-ghost text-xs gap-1.5 ${showGuides ? 'text-accent' : ''}`}
            onClick={() => setShowGuides(!showGuides)}
          >
            {showGuides ? <Eye size={12} /> : <EyeOff size={12} />}
            Repères
          </button>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8"
          style={{ background: 'repeating-linear-gradient(45deg,#161616 0,#161616 10px,#181818 10px,#181818 20px)' }}>
          {rawData.length === 0 ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="p-4 bg-surface-3 rounded-2xl">
                <Layers size={28} className="text-gray-600" />
              </div>
              <p className="text-sm text-gray-500">Importez des données pour voir l'aperçu live</p>
            </div>
          ) : (
            <VignetteCanvas
              dims={dims}
              row={previewRow}
              showGuides={showGuides}
            />
          )}
        </div>

        {/* Product navigator */}
        {totalProducts > 0 && (
          <div className="flex items-center justify-center gap-3 py-2.5 bg-surface-2 border-t border-surface-4 shrink-0">
            <button className="btn-icon" onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))} disabled={previewIndex === 0}>
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-gray-500">
              Produit <span className="text-gray-300 font-medium">{previewIndex + 1}</span> / {totalProducts}
              {previewRow && columns[0] && (
                <span className="ml-2 text-gray-600">— {String(previewRow[columns[0]] ?? '').slice(0, 30)}</span>
              )}
            </span>
            <button className="btn-icon" onClick={() => setPreviewIndex(Math.min(totalProducts - 1, previewIndex + 1))} disabled={previewIndex >= totalProducts - 1}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ══ Right panel — Block properties ════════════════════ */}
      <div className="w-72 shrink-0 bg-surface-2 border-l border-surface-4 overflow-y-auto">
        <BlockEditor block={selectedBlock} />
      </div>
    </div>
  )
}
