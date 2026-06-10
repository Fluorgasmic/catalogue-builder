import { ZoomIn, ZoomOut } from 'lucide-react'

/**
 * Compact zoom control: − / current % / +
 * Clicking the percentage resets to 100%.
 */
export default function ZoomControl({ zoom, onChange, min = 50, max = 250, step = 25 }) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        className="btn-icon"
        onClick={() => onChange(Math.max(min, zoom - step))}
        disabled={zoom <= min}
        title="Dézoomer"
      >
        <ZoomOut size={14} />
      </button>
      <button
        className="text-xs text-gray-400 hover:text-gray-200 w-11 text-center tabular-nums transition-colors"
        onClick={() => onChange(100)}
        title="Réinitialiser à 100 %"
      >
        {zoom}%
      </button>
      <button
        className="btn-icon"
        onClick={() => onChange(Math.min(max, zoom + step))}
        disabled={zoom >= max}
        title="Zoomer"
      >
        <ZoomIn size={14} />
      </button>
    </div>
  )
}
