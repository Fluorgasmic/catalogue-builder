import { GripVertical, Eye, EyeOff, Trash2, Type, Image, Tag, Minus, AlignLeft, ChevronUp, ChevronDown } from 'lucide-react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import useCatalogStore from '../../store/catalogStore'

const TYPE_ICONS = {
  text: Type, image: Image, static: AlignLeft, badge: Tag, separator: Minus,
}
const TYPE_COLORS = {
  text: '#7C5CFC', image: '#3b82f6', static: '#10b981', badge: '#f59e0b', separator: '#6b7280',
}
const TYPE_LABELS = {
  text: 'Texte', image: 'Image', static: 'Statique', badge: 'Badge', separator: 'Séparateur',
}

export default function BlockList() {
  const { vignetteBlocks, selectedBlockId, setSelectedBlock, reorderBlocks, updateBlock, removeBlock } = useCatalogStore()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = ({ active, over }) => {
    if (active.id !== over?.id) {
      const oldIdx = vignetteBlocks.findIndex(b => b.id === active.id)
      const newIdx = vignetteBlocks.findIndex(b => b.id === over.id)
      reorderBlocks(arrayMove(vignetteBlocks, oldIdx, newIdx))
    }
  }

  if (vignetteBlocks.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-xs text-gray-600">
        Aucun bloc — utilisez les boutons ci-dessus pour en ajouter
      </div>
    )
  }

  const moveUp = (id) => {
    const idx = vignetteBlocks.findIndex(b => b.id === id)
    if (idx > 0) reorderBlocks(arrayMove(vignetteBlocks, idx, idx - 1))
  }
  const moveDown = (id) => {
    const idx = vignetteBlocks.findIndex(b => b.id === id)
    if (idx < vignetteBlocks.length - 1) reorderBlocks(arrayMove(vignetteBlocks, idx, idx + 1))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={vignetteBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-0.5 px-2">
          {vignetteBlocks.map((block, idx) => (
            <SortableBlock
              key={block.id}
              block={block}
              selected={block.id === selectedBlockId}
              isFirst={idx === 0}
              isLast={idx === vignetteBlocks.length - 1}
              onSelect={() => setSelectedBlock(block.id)}
              onToggleVisibility={() => updateBlock(block.id, { visible: !block.visible })}
              onRemove={() => { removeBlock(block.id) }}
              onMoveUp={() => moveUp(block.id)}
              onMoveDown={() => moveDown(block.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableBlock({ block, selected, isFirst, isLast, onSelect, onToggleVisibility, onRemove, onMoveUp, onMoveDown }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const Icon = TYPE_ICONS[block.type] ?? Type
  const color = TYPE_COLORS[block.type] ?? '#888'

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  }

  const blockLabel = block.type === 'text'
    ? (block.columns?.[0] ? `{${block.columns[0]}}` : 'Texte lié')
    : block.type === 'static'
    ? (block.staticText?.slice(0, 18) || 'Texte statique')
    : TYPE_LABELS[block.type] ?? block.type

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer transition-colors group
        ${selected ? 'bg-accent/15 ring-1 ring-accent/40' : 'hover:bg-surface-4'}
        ${block.visible === false ? 'opacity-50' : ''}`}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <div {...attributes} {...listeners} className="drag-handle text-gray-700 hover:text-gray-500 shrink-0" onClick={e => e.stopPropagation()}>
        <GripVertical size={12} />
      </div>

      {/* Type icon */}
      <span className="p-1 rounded shrink-0" style={{ backgroundColor: color + '25' }}>
        <Icon size={9} style={{ color }} />
      </span>

      {/* Label */}
      <span className={`text-xs flex-1 truncate ${selected ? 'text-accent font-medium' : 'text-gray-400'}`}>
        {blockLabel}
      </span>

      {/* Actions (visible on hover/select) */}
      <div className={`flex items-center gap-0.5 ${selected ? 'flex' : 'hidden group-hover:flex'}`}>
        {/* Move up/down */}
        <button
          className="p-0.5 rounded hover:bg-surface-5 text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-25 disabled:cursor-default"
          onClick={(e) => { e.stopPropagation(); onMoveUp() }}
          disabled={isFirst}
          title="Monter"
        >
          <ChevronUp size={10} />
        </button>
        <button
          className="p-0.5 rounded hover:bg-surface-5 text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-25 disabled:cursor-default"
          onClick={(e) => { e.stopPropagation(); onMoveDown() }}
          disabled={isLast}
          title="Descendre"
        >
          <ChevronDown size={10} />
        </button>

        <button
          className="p-0.5 rounded hover:bg-surface-5 text-gray-600 hover:text-gray-300 transition-colors"
          onClick={(e) => { e.stopPropagation(); onToggleVisibility() }}
          title={block.visible === false ? 'Afficher' : 'Masquer'}
        >
          {block.visible === false ? <EyeOff size={10} /> : <Eye size={10} />}
        </button>
        <button
          className="p-0.5 rounded hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-colors"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          title="Supprimer"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  )
}
