import { useState, useRef, useMemo } from 'react'
import {
  Type, Image as ImageIcon, Minus, AlignLeft, AlignCenter, AlignRight,
  Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Upload, X, Layers,
  ArrowUpFromLine, ArrowDownFromLine, Move, Maximize2, Copy
} from 'lucide-react'
import useCatalogStore from '../../store/catalogStore'
import { calcVignetteDimensions, mmToCssPx } from '../../utils/layoutCalculator'
import { AnyBlock } from '../VignetteBuilder/blockRenderer'
import NumberInput from '../UI/NumberInput'
import Toggle from '../UI/Toggle'
import ColorPickerInline from './ColorPickerInline'

// ─── nanoid ──────────────────────────────────────────────────────────────────

const nanoid = (size = 10) =>
  Array.from(crypto.getRandomValues(new Uint8Array(size)))
    .map(b => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62])
    .join('')

// ─── Constants ───────────────────────────────────────────────────────────────

const HF_BLOCK_TYPES = [
  { type: 'static',    icon: Type,      label: 'Texte libre',    color: '#10b981' },
  { type: 'image',     icon: ImageIcon,  label: 'Image / Logo',   color: '#3b82f6' },
  { type: 'separator', icon: Minus,      label: 'Separateur',     color: '#6b7280' },
]

const TYPE_ICONS = { static: Type, image: ImageIcon, separator: Minus }
const TYPE_COLORS = { static: '#10b981', image: '#3b82f6', separator: '#6b7280' }

const BUILTIN_FONTS = [
  'inherit', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Raleway', 'Oswald', 'Merriweather', 'Playfair Display', 'Source Sans Pro',
]

const FONT_WEIGHTS = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semi-bold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Heavy' },
]

function getFontFormat(fileName) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'woff2') return 'woff2'
  if (ext === 'woff') return 'woff'
  return 'truetype'
}

const MM_PER_PX = 25.4 / 96

// ─── Block creation (free-form: all blocks have x, y, w, h in mm) ───────────

function createHFBlock(type, zoneW = 210, zoneH = 18, existingCount = 0) {
  const base = { id: nanoid(), type, visible: true }
  const padL = 12 // default margin hint
  const yOff = Math.min(existingCount * 4, Math.max(0, zoneH - 6))

  switch (type) {
    case 'static':
      return {
        ...base,
        x: padL, y: yOff,
        w: zoneW - padL * 2, h: 6,
        staticText: '',
        fontSize: 10, fontWeight: 400, fontFamily: 'inherit',
        color: '#111111', align: 'left', vAlign: 'center',
        italic: false, paddingH: 3, paddingV: 2, maxLines: 1,
        bgColor: null, bgBorderRadius: 0, widthMode: 'full',
      }
    case 'image':
      return {
        ...base,
        x: padL, y: Math.max(1, (zoneH - Math.min(zoneH - 2, 14)) / 2),
        w: Math.min(30, zoneW * 0.2), h: Math.min(zoneH - 2, 14),
        directSrc: null, heightPct: 100, fit: 'contain',
      }
    case 'separator':
      return {
        ...base,
        x: padL, y: Math.min(yOff + 2, zoneH - 2),
        w: zoneW - padL * 2, h: 2,
        thickness: 1, color: '#e5e7eb', marginV: 0.5, separatorWidth: '100%',
      }
    default:
      return base
  }
}

// ─── Fallback block height (for old blocks without h) ────────────────────────

function fallbackBlockH(block, zoneHmm) {
  switch (block.type) {
    case 'static':
      return Math.max(4, (block.fontSize ?? 10) * 0.45 * (block.maxLines ?? 1) + (block.paddingV ?? 2) * 0.6)
    case 'image':
      return (block.heightPct ?? 80) / 100 * zoneHmm
    case 'separator':
      return Math.max(1.5, (block.marginV ?? 1) * 0.8 + (block.thickness ?? 1) * 0.3)
    default:
      return 5
  }
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function HeaderFooterBuilder() {
  const {
    grid, header, footer, setHeader, setFooter,
    headerBlocks, footerBlocks,
    selectedHFBlockId, setSelectedHFBlock,
    addHFBlock, updateHFBlock, removeHFBlock, reorderHFBlocks,
    customFonts, addCustomFont,
    savedColors, addSavedColor,
  } = useCatalogStore()

  const [section, setSection] = useState('header') // 'header' | 'footer'

  const blocks = section === 'header' ? headerBlocks : footerBlocks
  const sectionConfig = section === 'header' ? header : footer
  const setConfig = section === 'header' ? setHeader : setFooter

  const selectedBlock = blocks.find(b => b.id === selectedHFBlockId) ?? null

  const dims = useMemo(() => calcVignetteDimensions(grid, header, footer), [grid, header, footer])

  const zoneWmm = dims.pageW
  const zoneHmm = sectionConfig.height ?? (section === 'header' ? 18 : 8)

  const handleAddBlock = (type) => {
    const block = createHFBlock(type, zoneWmm, zoneHmm, blocks.length)
    addHFBlock(section, block)
  }

  const handleUpdate = (id, patch) => updateHFBlock(section, id, patch)
  const handleRemove = (id) => removeHFBlock(section, id)

  const handleDuplicate = (id) => {
    const orig = blocks.find(b => b.id === id)
    if (!orig) return
    const dup = { ...orig, id: nanoid(), x: (orig.x ?? 0) + 3, y: (orig.y ?? 0) + 3 }
    addHFBlock(section, dup)
  }

  const moveUp = (id) => {
    const idx = blocks.findIndex(b => b.id === id)
    if (idx > 0) {
      const arr = [...blocks]
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      reorderHFBlocks(section, arr)
    }
  }
  const moveDown = (id) => {
    const idx = blocks.findIndex(b => b.id === id)
    if (idx < blocks.length - 1) {
      const arr = [...blocks]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      reorderHFBlocks(section, arr)
    }
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* == Left panel ================================================= */}
      <div className="w-52 shrink-0 bg-surface-2 border-r border-surface-4 flex flex-col overflow-hidden">

        {/* Section tabs */}
        <div className="flex border-b border-surface-4">
          {[['header', 'En-tete'], ['footer', 'Pied de page']].map(([id, label]) => (
            <button
              key={id}
              className={`flex-1 py-3 text-xs font-medium transition-colors flex items-center justify-center gap-1.5
                ${section === id ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={() => { setSection(id); setSelectedHFBlock(null) }}
            >
              {id === 'header' ? <ArrowUpFromLine size={12} /> : <ArrowDownFromLine size={12} />}
              {label}
            </button>
          ))}
        </div>

        {/* Add block buttons */}
        <div className="px-3 pt-3 pb-2 border-b border-surface-4">
          <p className="section-title mb-2">Ajouter un bloc</p>
          <div className="flex flex-col gap-1">
            {HF_BLOCK_TYPES.map(({ type, icon: Icon, label, color }) => (
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

        {/* Block list (z-order: first = back, last = front) */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 mb-2 flex items-center justify-between">
            <p className="section-title mb-0">Blocs ({blocks.length})</p>
            {blocks.length > 1 && (
              <span className="text-[9px] text-gray-600">z-order</span>
            )}
          </div>
          {blocks.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-gray-600">
              Aucun bloc
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 px-2">
              {blocks.map((block, idx) => (
                <BlockItem
                  key={block.id}
                  block={block}
                  selected={block.id === selectedHFBlockId}
                  isFirst={idx === 0}
                  isLast={idx === blocks.length - 1}
                  onSelect={() => setSelectedHFBlock(block.id)}
                  onToggle={() => handleUpdate(block.id, { visible: !block.visible })}
                  onRemove={() => handleRemove(block.id)}
                  onDuplicate={() => handleDuplicate(block.id)}
                  onMoveUp={() => moveUp(block.id)}
                  onMoveDown={() => moveDown(block.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* == Center -- Canvas preview ==================================== */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface-1">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-2 border-b border-surface-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {section === 'header' ? 'En-tete' : 'Pied de page'} :
              <span className="text-gray-300 font-medium ml-1">
                {dims.pageW.toFixed(0)} x {zoneHmm.toFixed(0)} mm
              </span>
            </span>
          </div>
          <Toggle
            value={sectionConfig.enabled}
            onChange={(v) => setConfig({ enabled: v })}
            label={sectionConfig.enabled ? 'Active' : 'Desactive'}
          />
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8"
          style={{ background: 'repeating-linear-gradient(45deg,#161616 0,#161616 10px,#181818 10px,#181818 20px)' }}>

          {sectionConfig.enabled ? (
            <HFPreviewCanvas
              blocks={blocks}
              sectionConfig={sectionConfig}
              section={section}
              dims={dims}
              grid={grid}
              zoneWmm={zoneWmm}
              zoneHmm={zoneHmm}
              selectedBlockId={selectedHFBlockId}
              onSelectBlock={setSelectedHFBlock}
              onUpdateBlock={(id, patch) => handleUpdate(id, patch)}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="p-4 bg-surface-3 rounded-2xl">
                <Layers size={28} className="text-gray-600" />
              </div>
              <p className="text-sm text-gray-500">
                {section === 'header' ? "L'en-tete" : 'Le pied de page'} est desactive
              </p>
            </div>
          )}
        </div>

        {/* Template variables hint */}
        {sectionConfig.enabled && (
          <div className="px-4 py-2 bg-surface-2 border-t border-surface-4 shrink-0">
            <p className="text-[10px] text-gray-600">
              Variables disponibles dans les textes :
              <code className="mx-1 text-accent/70">{'{page}'}</code>
              <code className="mx-1 text-accent/70">{'{total}'}</code>
              <code className="mx-1 text-accent/70">{'{group}'}</code>
              <span className="ml-3 text-gray-600">
                Glissez les blocs pour les positionner. Coin inferieur droit pour redimensionner.
              </span>
            </p>
          </div>
        )}
      </div>

      {/* == Right panel -- Block editor or general settings ============= */}
      <div className="w-72 shrink-0 bg-surface-2 border-l border-surface-4 overflow-y-auto">
        {selectedBlock ? (
          <HFBlockEditor
            block={selectedBlock}
            section={section}
            zoneWmm={zoneWmm}
            zoneHmm={zoneHmm}
            onUpdate={(patch) => handleUpdate(selectedBlock.id, patch)}
          />
        ) : (
          <GeneralSettings
            section={section}
            config={sectionConfig}
            setConfig={setConfig}
          />
        )}
      </div>
    </div>
  )
}

// ─── Free-form preview canvas ────────────────────────────────────────────────

function HFPreviewCanvas({
  blocks, sectionConfig, section, dims, grid,
  zoneWmm, zoneHmm,
  selectedBlockId, onSelectBlock, onUpdateBlock,
}) {
  const { imageBasePath, imageColumn, imageExtension } = useCatalogStore()
  const canvasRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const CANVAS_WIDTH = 580
  const pxPerMm = CANVAS_WIDTH / zoneWmm
  const canvasH = zoneHmm * pxPerMm
  const scale = pxPerMm / (96 / 25.4) // AnyBlock font/padding scale

  const visibleBlocks = blocks.filter(b => b.visible !== false)

  // Template variable replacement for preview
  const processedBlocks = visibleBlocks.map(b => {
    if (b.type === 'static' && b.staticText) {
      return {
        ...b,
        staticText: b.staticText
          .replace(/\{page\}/g, '1')
          .replace(/\{total\}/g, '5')
          .replace(/\{group\}/g, 'Groupe exemple'),
      }
    }
    return b
  })

  const hasBg = sectionConfig.bgColor && sectionConfig.bgColor !== 'transparent'

  // Padding guides (mm)
  const padLmm = sectionConfig.paddingLeft ?? grid.margins.left
  const padRmm = sectionConfig.paddingRight ?? grid.margins.right

  // ─── Drag logic ──────────────────────────────────────────
  const startDrag = (e, block, type) => {
    e.stopPropagation()
    e.preventDefault()
    onSelectBlock(block.id)

    const ppm = pxPerMm
    const update = onUpdateBlock
    const zwmm = zoneWmm
    const zhmm = zoneHmm

    const state = {
      type,
      blockId: block.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: block.x ?? 0,
      origY: block.y ?? 0,
      origW: block.w ?? zwmm,
      origH: block.h ?? fallbackBlockH(block, zhmm),
    }

    setIsDragging(true)

    const onMove = (ev) => {
      const dx = (ev.clientX - state.startX) / ppm
      const dy = (ev.clientY - state.startY) / ppm

      if (state.type === 'move') {
        update(state.blockId, {
          x: Math.round(Math.max(0, state.origX + dx) * 10) / 10,
          y: Math.round(Math.max(0, state.origY + dy) * 10) / 10,
        })
      } else {
        // resize
        update(state.blockId, {
          w: Math.round(Math.max(5, state.origW + dx) * 10) / 10,
          h: Math.round(Math.max(2, state.origH + dy) * 10) / 10,
        })
      }
    }

    const onUp = () => {
      setIsDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={canvasRef}
        className="relative select-none"
        style={{
          width: CANVAS_WIDTH,
          height: canvasH,
          flexShrink: 0,
          backgroundColor: hasBg ? sectionConfig.bgColor : '#ffffff',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
          cursor: isDragging ? 'grabbing' : 'default',
          // subtle mm grid
          backgroundImage: `
            linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)
          `,
          backgroundSize: `${5 * pxPerMm}px ${5 * pxPerMm}px`,
        }}
        onClick={(e) => {
          if (e.target === canvasRef.current) onSelectBlock(null)
        }}
      >
        {/* Padding guides */}
        <div className="absolute top-0 bottom-0 pointer-events-none"
          style={{ left: padLmm * pxPerMm, borderLeft: '1px dashed rgba(124,92,252,0.35)' }} />
        <div className="absolute top-0 bottom-0 pointer-events-none"
          style={{ right: padRmm * pxPerMm, borderRight: '1px dashed rgba(124,92,252,0.35)' }} />

        {/* Empty state */}
        {processedBlocks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p style={{ fontSize: 11, color: '#d1d5db' }}>
              Ajoutez des blocs pour construire {section === 'header' ? "l'en-tete" : 'le pied de page'}
            </p>
          </div>
        )}

        {/* Blocks */}
        {processedBlocks.map((block, idx) => {
          const bx = (block.x ?? 0) * pxPerMm
          const by = (block.y ?? 0) * pxPerMm
          const bw = (block.w ?? zoneWmm) * pxPerMm
          const bhMm = block.h ?? fallbackBlockH(block, zoneHmm)
          const bh = bhMm * pxPerMm
          const isSelected = block.id === selectedBlockId

          return (
            <div
              key={block.id}
              className="absolute group"
              style={{
                left: bx,
                top: by,
                width: bw,
                height: bh,
                cursor: isDragging ? 'grabbing' : 'move',
                zIndex: isSelected ? 50 : idx + 1,
              }}
              onPointerDown={(e) => startDrag(e, block, 'move')}
            >
              {/* Block content */}
              <div className="w-full h-full overflow-hidden">
                <AnyBlock
                  block={block}
                  row={{}}
                  vignetteWpx={bw}
                  vignetteHpx={bh}
                  scale={scale}
                  imageBasePath={imageBasePath}
                  imageColumn={imageColumn}
                  imageExtension={imageExtension}
                />
              </div>

              {/* Hover outline */}
              {!isSelected && (
                <div className="absolute inset-0 border border-transparent group-hover:border-accent/30 pointer-events-none rounded-sm transition-colors" />
              )}

              {/* Selection ring + resize handle */}
              {isSelected && (
                <>
                  <div className="absolute inset-0 ring-2 ring-accent/70 pointer-events-none rounded-sm" />
                  {/* Corner handles */}
                  <div className="absolute w-2 h-2 bg-accent rounded-full pointer-events-none"
                    style={{ left: -3, top: -3 }} />
                  <div className="absolute w-2 h-2 bg-accent rounded-full pointer-events-none"
                    style={{ right: -3, top: -3 }} />
                  <div className="absolute w-2 h-2 bg-accent rounded-full pointer-events-none"
                    style={{ left: -3, bottom: -3 }} />
                  {/* Bottom-right resize handle */}
                  <div
                    className="absolute w-3 h-3 bg-accent border-2 border-white rounded-sm cursor-se-resize z-10"
                    style={{ right: -5, bottom: -5 }}
                    onPointerDown={(e) => startDrag(e, block, 'resize')}
                  />
                </>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-gray-600">
        {zoneWmm.toFixed(0)} x {zoneHmm} mm
      </p>
    </div>
  )
}

// ─── Block list item ─────────────────────────────────────────────────────────

function BlockItem({ block, selected, isFirst, isLast, onSelect, onToggle, onRemove, onDuplicate, onMoveUp, onMoveDown }) {
  const Icon = TYPE_ICONS[block.type] ?? Type
  const color = TYPE_COLORS[block.type] ?? '#888'

  const label = block.type === 'static'
    ? (block.staticText?.slice(0, 20) || 'Texte libre')
    : block.type === 'image'
    ? (block.directSrc ? 'Image' : 'Image vide')
    : 'Separateur'

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer transition-colors group
        ${selected ? 'bg-accent/15 ring-1 ring-accent/40' : 'hover:bg-surface-4'}
        ${block.visible === false ? 'opacity-50' : ''}`}
      onClick={onSelect}
    >
      <span className="p-1 rounded shrink-0" style={{ backgroundColor: color + '25' }}>
        <Icon size={9} style={{ color }} />
      </span>
      <span className={`text-xs flex-1 truncate ${selected ? 'text-accent font-medium' : 'text-gray-400'}`}>
        {label}
      </span>
      <div className={`flex items-center gap-0.5 ${selected ? 'flex' : 'hidden group-hover:flex'}`}>
        <button className="p-0.5 rounded hover:bg-surface-5 text-gray-600 hover:text-gray-300 disabled:opacity-25"
          title="Reculer (z-order)"
          onClick={(e) => { e.stopPropagation(); onMoveUp() }} disabled={isFirst}>
          <ChevronUp size={10} />
        </button>
        <button className="p-0.5 rounded hover:bg-surface-5 text-gray-600 hover:text-gray-300 disabled:opacity-25"
          title="Avancer (z-order)"
          onClick={(e) => { e.stopPropagation(); onMoveDown() }} disabled={isLast}>
          <ChevronDown size={10} />
        </button>
        <button className="p-0.5 rounded hover:bg-surface-5 text-gray-600 hover:text-gray-300"
          title="Dupliquer"
          onClick={(e) => { e.stopPropagation(); onDuplicate() }}>
          <Copy size={10} />
        </button>
        <button className="p-0.5 rounded hover:bg-surface-5 text-gray-600 hover:text-gray-300"
          onClick={(e) => { e.stopPropagation(); onToggle() }}>
          {block.visible === false ? <EyeOff size={10} /> : <Eye size={10} />}
        </button>
        <button className="p-0.5 rounded hover:bg-red-500/20 text-gray-600 hover:text-red-400"
          onClick={(e) => { e.stopPropagation(); onRemove() }}>
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  )
}

// ─── Block editor ────────────────────────────────────────────────────────────

function HFBlockEditor({ block, section, zoneWmm, zoneHmm, onUpdate }) {
  const { customFonts, addCustomFont, savedColors, addSavedColor } = useCatalogStore()
  const fontInputRef = useRef()

  const allFonts = [
    ...BUILTIN_FONTS.map(f => ({ value: f, label: f === 'inherit' ? 'Par defaut' : f })),
    ...((customFonts ?? []).length > 0 ? [{ value: '__sep__', label: '-- Polices perso --', disabled: true }] : []),
    ...(customFonts ?? []).map(f => ({ value: f.name, label: f.name })),
  ]

  const handleFontUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const format = getFontFormat(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      addCustomFont({ name, src: ev.target.result, format })
      onUpdate({ fontFamily: name })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const Icon = TYPE_ICONS[block.type] ?? Type
  const typeLabel = { static: 'Texte libre', image: 'Image / Logo', separator: 'Separateur' }[block.type] ?? block.type

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-surface-4 shrink-0">
        <span className="p-1.5 rounded" style={{ backgroundColor: (TYPE_COLORS[block.type] ?? '#888') + '25' }}>
          <Icon size={13} style={{ color: TYPE_COLORS[block.type] }} />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{typeLabel}</p>
          <p className="text-[10px] text-gray-600 font-mono">{block.id}</p>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-4 overflow-y-auto">

        {/* ── Position & Size (all block types) ──────────────── */}
        <EditorSection title="Position & Taille">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="label mb-1 block">X</label>
              <NumberInput value={block.x ?? 0} onChange={(v) => onUpdate({ x: v })}
                min={0} max={zoneWmm} step={0.5} unit="mm" />
            </div>
            <div>
              <label className="label mb-1 block">Y</label>
              <NumberInput value={block.y ?? 0} onChange={(v) => onUpdate({ y: v })}
                min={0} max={zoneHmm} step={0.5} unit="mm" />
            </div>
            <div>
              <label className="label mb-1 block">Largeur</label>
              <NumberInput value={block.w ?? zoneWmm} onChange={(v) => onUpdate({ w: v })}
                min={2} max={zoneWmm * 2} step={0.5} unit="mm" />
            </div>
            <div>
              <label className="label mb-1 block">Hauteur</label>
              <NumberInput value={block.h ?? fallbackBlockH(block, zoneHmm)} onChange={(v) => onUpdate({ h: v })}
                min={1} max={zoneHmm * 2} step={0.5} unit="mm" />
            </div>
          </div>
        </EditorSection>

        {/* ── Static text block ─────────────────────────────── */}
        {block.type === 'static' && (
          <>
            <EditorSection title="Contenu">
              <textarea
                className="input text-sm resize-none"
                rows={2}
                value={block.staticText ?? ''}
                onChange={(e) => onUpdate({ staticText: e.target.value })}
                placeholder="Texte libre ou variables : {page} {total} {group}"
              />
              <p className="mt-1 text-[10px] text-gray-600">
                <code className="text-accent/60">{'{page}'}</code> = num page,
                <code className="text-accent/60 ml-1">{'{total}'}</code> = total pages,
                <code className="text-accent/60 ml-1">{'{group}'}</code> = nom du groupe
              </p>
            </EditorSection>

            <EditorSection title="Typographie">
              <div className="flex flex-col gap-2.5">
                {/* Font */}
                <div>
                  <label className="label mb-1 block">Police</label>
                  <div className="flex gap-1.5">
                    <select className="input text-xs flex-1"
                      value={block.fontFamily ?? 'inherit'}
                      onChange={(e) => { if (e.target.value !== '__sep__') onUpdate({ fontFamily: e.target.value }) }}>
                      {allFonts.map(f => <option key={f.value} value={f.value} disabled={f.disabled}>{f.label}</option>)}
                    </select>
                    <button className="px-2 py-1.5 bg-surface-3 border border-surface-5 rounded-lg text-gray-500 hover:text-gray-300"
                      title="Charger une police" onClick={() => fontInputRef.current?.click()}>
                      <Upload size={12} />
                    </button>
                    <input ref={fontInputRef} type="file" className="hidden" accept=".ttf,.woff,.woff2,.otf" onChange={handleFontUpload} />
                  </div>
                </div>
                {/* Size + weight */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="label mb-1 block">Taille</label>
                    <NumberInput value={block.fontSize ?? 10} onChange={(v) => onUpdate({ fontSize: v })}
                      min={4} max={72} step={0.5} unit="pt" />
                  </div>
                  <div className="flex-1">
                    <label className="label mb-1 block">Graisse</label>
                    <select className="input text-xs" value={block.fontWeight ?? 400}
                      onChange={(e) => onUpdate({ fontWeight: Number(e.target.value) })}>
                      {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                    </select>
                  </div>
                </div>
                {/* Color */}
                <div>
                  <label className="label mb-1 block">Couleur</label>
                  <ColorPickerInline value={block.color ?? '#111111'} onChange={(v) => onUpdate({ color: v })} />
                </div>
                {/* Italic */}
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={block.italic ?? false}
                    onChange={(e) => onUpdate({ italic: e.target.checked })} className="accent-accent" />
                  Italique
                </label>
              </div>
            </EditorSection>

            <EditorSection title="Alignement">
              <div className="flex gap-3 mb-3">
                <div>
                  <label className="label mb-1 block">Horizontal</label>
                  <AlignButtons value={block.align ?? 'left'} onChange={(v) => onUpdate({ align: v })} />
                </div>
                <div>
                  <label className="label mb-1 block">Vertical</label>
                  <div className="flex rounded-lg overflow-hidden border border-surface-5">
                    {[['top', 'Haut'], ['center', 'Centre'], ['bottom', 'Bas']].map(([v, l]) => (
                      <button key={v}
                        className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors
                          ${(block.vAlign ?? 'center') === v ? 'bg-accent text-white' : 'bg-surface-3 text-gray-400 hover:text-gray-200'}`}
                        onClick={() => onUpdate({ vAlign: v })}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </EditorSection>

            <EditorSection title="Espacement">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="label mb-1 block">Padding H</label>
                  <NumberInput value={block.paddingH ?? 3} onChange={(v) => onUpdate({ paddingH: v })}
                    min={0} max={30} step={0.5} />
                </div>
                <div className="flex-1">
                  <label className="label mb-1 block">Padding V</label>
                  <NumberInput value={block.paddingV ?? 2} onChange={(v) => onUpdate({ paddingV: v })}
                    min={0} max={30} step={0.5} />
                </div>
              </div>
              <div className="mt-2">
                <label className="label mb-1 block">Lignes max</label>
                <NumberInput value={block.maxLines ?? 1} onChange={(v) => onUpdate({ maxLines: v })}
                  min={1} max={10} step={1} />
              </div>
            </EditorSection>

            <EditorSection title="Arriere-plan">
              <div className="flex items-center gap-3 mb-3">
                <label className="label">Couleur</label>
                <ColorPickerInline
                  value={(block.bgColor && block.bgColor !== 'transparent') ? block.bgColor : '#ffffff'}
                  onChange={(v) => onUpdate({ bgColor: v })}
                  allowTransparent
                  isTransparent={!block.bgColor || block.bgColor === 'transparent'}
                  onTransparent={() => onUpdate({ bgColor: null })}
                />
              </div>
              {block.bgColor && block.bgColor !== 'transparent' && (
                <>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="label mb-1 block">Rayon bordure</label>
                      <NumberInput value={block.bgBorderRadius ?? 0} onChange={(v) => onUpdate({ bgBorderRadius: v })}
                        min={0} max={20} step={0.5} />
                    </div>
                    <div className="flex-1">
                      <label className="label mb-1 block">Mode largeur</label>
                      <div className="flex rounded-lg overflow-hidden border border-surface-5">
                        {[['full', 'Plein'], ['fit', 'Texte']].map(([v, l]) => (
                          <button key={v}
                            className={`flex-1 py-1.5 text-[10px] font-medium transition-colors
                              ${(block.widthMode ?? 'full') === v ? 'bg-accent text-white' : 'bg-surface-3 text-gray-400 hover:text-gray-200'}`}
                            onClick={() => onUpdate({ widthMode: v })}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </EditorSection>
          </>
        )}

        {/* ── Image block ──────────────────────────────────── */}
        {block.type === 'image' && (
          <>
            <EditorSection title="Image">
              <ImageUpload
                src={block.directSrc}
                onChange={(src) => onUpdate({ directSrc: src })}
              />
            </EditorSection>
            <EditorSection title="Ajustement">
              <div>
                <label className="label mb-1 block">Mode</label>
                <select className="input text-xs" value={block.fit ?? 'contain'}
                  onChange={(e) => onUpdate({ fit: e.target.value })}>
                  <option value="contain">Contenir</option>
                  <option value="cover">Couvrir</option>
                  <option value="fill">Etirer</option>
                </select>
              </div>
            </EditorSection>
          </>
        )}

        {/* ── Separator block ──────────────────────────────── */}
        {block.type === 'separator' && (
          <>
            <EditorSection title="Separateur">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="label mb-1 block">Epaisseur</label>
                  <NumberInput value={block.thickness ?? 1} onChange={(v) => onUpdate({ thickness: v })}
                    min={0.25} max={10} step={0.25} unit="px" />
                </div>
                <div>
                  <label className="label mb-1 block">Couleur</label>
                  <ColorPickerInline value={block.color ?? '#e5e7eb'} onChange={(v) => onUpdate({ color: v })} />
                </div>
                <div>
                  <label className="label mb-1 block">Marge verticale</label>
                  <NumberInput value={block.marginV ?? 1} onChange={(v) => onUpdate({ marginV: v })}
                    min={0} max={20} step={0.5} />
                </div>
                <div>
                  <label className="label mb-1 block">Largeur</label>
                  <select className="input text-xs" value={block.separatorWidth ?? '100%'}
                    onChange={(e) => onUpdate({ separatorWidth: e.target.value })}>
                    <option value="100%">100%</option>
                    <option value="80%">80%</option>
                    <option value="60%">60%</option>
                    <option value="50%">50%</option>
                    <option value="40%">40%</option>
                  </select>
                </div>
              </div>
            </EditorSection>
          </>
        )}
      </div>
    </div>
  )
}

// ─── General settings (when no block selected) ──────────────────────────────

function GeneralSettings({ section, config, setConfig }) {
  const isHeader = section === 'header'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-surface-4 shrink-0">
        <span className="p-1.5 rounded bg-surface-4">
          {isHeader ? <ArrowUpFromLine size={13} className="text-gray-400" /> : <ArrowDownFromLine size={13} className="text-gray-400" />}
        </span>
        <div>
          <p className="text-sm font-semibold text-white">
            {isHeader ? "Reglages de l'en-tete" : 'Reglages du pied de page'}
          </p>
          <p className="text-[10px] text-gray-600">Selectionnez un bloc pour l'editer</p>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-4 overflow-y-auto">
        <EditorSection title="Dimensions">
          <div className="flex flex-col gap-3">
            <div>
              <label className="label mb-1 block">Hauteur</label>
              <NumberInput
                value={config.height ?? (isHeader ? 18 : 8)}
                onChange={(v) => setConfig({ height: v })}
                min={4} max={80} step={0.5} unit="mm"
              />
            </div>
            <div>
              <label className="label mb-1 block">
                {isHeader ? 'Espace apres (avant vignettes)' : 'Espace avant (apres vignettes)'}
              </label>
              <NumberInput
                value={isHeader ? (config.spacingAfter ?? 0) : (config.spacingBefore ?? 0)}
                onChange={(v) => setConfig(isHeader ? { spacingAfter: v } : { spacingBefore: v })}
                min={0} max={30} step={0.5} unit="mm"
              />
            </div>
          </div>
        </EditorSection>

        <EditorSection title="Fond">
          <div className="flex items-center gap-3">
            <label className="label">Couleur de fond</label>
            <ColorPickerInline
              value={config.bgColor === 'transparent' ? '#ffffff' : (config.bgColor ?? '#ffffff')}
              onChange={(v) => setConfig({ bgColor: v })}
              allowTransparent
              isTransparent={config.bgColor === 'transparent'}
              onTransparent={() => setConfig({ bgColor: 'transparent' })}
            />
          </div>
        </EditorSection>

        <EditorSection title="Marges personnalisees">
          <p className="text-[10px] text-gray-600 mb-2">
            Par defaut, les marges de la grille sont utilisees.
            Les guides violets dans le canvas indiquent les marges.
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label mb-1 block">Gauche</label>
              <NumberInput value={config.paddingLeft ?? ''} onChange={(v) => setConfig({ paddingLeft: v })}
                min={0} max={50} step={0.5} unit="mm" />
              {config.paddingLeft != null && (
                <button className="mt-1 text-[10px] text-gray-600 hover:text-accent" onClick={() => setConfig({ paddingLeft: null })}>
                  Reset
                </button>
              )}
            </div>
            <div className="flex-1">
              <label className="label mb-1 block">Droite</label>
              <NumberInput value={config.paddingRight ?? ''} onChange={(v) => setConfig({ paddingRight: v })}
                min={0} max={50} step={0.5} unit="mm" />
              {config.paddingRight != null && (
                <button className="mt-1 text-[10px] text-gray-600 hover:text-accent" onClick={() => setConfig({ paddingRight: null })}>
                  Reset
                </button>
              )}
            </div>
          </div>
        </EditorSection>
      </div>
    </div>
  )
}

// ─── Shared UI helpers ───────────────────────────────────────────────────────

function EditorSection({ title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
      <div className="border-t border-surface-4 pt-3">{children}</div>
    </div>
  )
}

function AlignButtons({ value, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-surface-5">
      {[
        { v: 'left',   Icon: AlignLeft },
        { v: 'center', Icon: AlignCenter },
        { v: 'right',  Icon: AlignRight },
      ].map(({ v, Icon }) => (
        <button key={v}
          className={`p-2 transition-colors ${value === v ? 'bg-accent text-white' : 'bg-surface-3 text-gray-400 hover:text-gray-200'}`}
          onClick={() => onChange(v)}>
          <Icon size={12} />
        </button>
      ))}
    </div>
  )
}

function ImageUpload({ src, onChange }) {
  const inputRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onChange(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  if (src) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-24 h-14 bg-surface-3 border border-surface-5 rounded-lg flex items-center justify-center overflow-hidden">
          <img src={src} alt="" className="max-w-full max-h-full object-contain" />
        </div>
        <button className="btn-ghost text-xs gap-1" onClick={() => onChange(null)}>
          <X size={12} /> Supprimer
        </button>
      </div>
    )
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-surface-5 hover:border-accent/50 rounded-lg text-xs text-gray-500 hover:text-gray-300 transition-colors w-full justify-center"
        onClick={() => inputRef.current?.click()}
      >
        <ImageIcon size={14} />
        Charger une image (PNG, SVG, JPG)
      </button>
    </>
  )
}
