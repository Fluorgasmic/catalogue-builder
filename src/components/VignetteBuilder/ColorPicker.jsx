import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Plus, Pipette } from 'lucide-react'

export default function ColorPicker({ color, onChange, savedColors = [], onSaveColor }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        className="flex items-center gap-2 px-3 py-2 bg-surface-3 border border-surface-5 rounded-lg hover:border-surface-6 transition-colors w-full"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className="w-4 h-4 rounded-sm border border-white/10 shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs text-gray-300 font-mono flex-1 text-left">{color}</span>
        <Pipette size={11} className="text-gray-600" />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 bg-surface-3 border border-surface-5 rounded-xl shadow-2xl p-3 w-56 animate-fadeIn">
          {/* Color picker */}
          <div className="mb-3 [&_.react-colorful]:w-full [&_.react-colorful__saturation]:rounded-lg [&_.react-colorful__hue]:rounded-full [&_.react-colorful__hue]:mt-2">
            <HexColorPicker color={color} onChange={onChange} />
          </div>

          {/* Hex input */}
          <div className="flex items-center gap-2 mb-3">
            <input
              className="input text-xs font-mono flex-1"
              value={color}
              onChange={e => {
                const v = e.target.value
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
              }}
              maxLength={7}
            />
            <button
              className="btn-icon bg-surface-4 border border-surface-5 rounded-lg p-1.5"
              onClick={() => { onSaveColor?.(color); }}
              title="Enregistrer cette couleur"
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Saved palette */}
          {savedColors.length > 0 && (
            <>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Palette enregistrée</p>
              <div className="flex flex-wrap gap-1.5">
                {savedColors.map(c => (
                  <button
                    key={c}
                    className="w-5 h-5 rounded border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: c === color ? 'white' : 'transparent',
                    }}
                    onClick={() => onChange(c)}
                    title={c}
                  />
                ))}
              </div>
            </>
          )}

          {/* Common colors */}
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-3 mb-2">Couleurs rapides</p>
          <div className="flex flex-wrap gap-1.5">
            {['#000000','#ffffff','#374151','#6b7280','#ef4444','#f59e0b','#10b981','#3b82f6','#7C5CFC','#ec4899'].map(c => (
              <button
                key={c}
                className="w-5 h-5 rounded border transition-all hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: c === color ? '#7C5CFC' : c === '#ffffff' ? '#374151' : 'transparent',
                }}
                onClick={() => onChange(c)}
                title={c}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
