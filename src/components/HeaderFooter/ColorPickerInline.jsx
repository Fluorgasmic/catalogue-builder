import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'

/**
 * Compact inline color picker — shows a color swatch that opens a popover.
 */
export default function ColorPickerInline({ value, onChange, allowTransparent, isTransparent, onTransparent }) {
  const [open, setOpen] = useState(false)
  const [hex, setHex] = useState(value ?? '#000000')
  const ref = useRef()

  // Sync external value → local hex
  useEffect(() => { if (value) setHex(value) }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleHexInput = (e) => {
    const v = e.target.value
    setHex(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v)
  }

  const handlePickerChange = (color) => {
    setHex(color)
    onChange(color)
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2">
        {/* Swatch */}
        <button
          className="w-7 h-7 rounded-md border border-surface-5 shrink-0 overflow-hidden"
          style={{ background: isTransparent ? 'repeating-conic-gradient(#444 0% 25%, #222 0% 50%) 0 0 / 8px 8px' : value }}
          onClick={() => setOpen(o => !o)}
          title="Choisir une couleur"
        />
        {/* Hex value */}
        <input
          className="input font-mono text-xs w-24"
          value={isTransparent ? 'transparent' : hex}
          onChange={handleHexInput}
          disabled={isTransparent}
        />
        {/* Transparent toggle */}
        {allowTransparent && (
          <button
            className={`text-xs px-2 py-1 rounded border transition-colors ${isTransparent ? 'border-accent text-accent bg-accent/10' : 'border-surface-5 text-gray-500 hover:text-gray-300'}`}
            onClick={() => isTransparent ? onChange(hex) : onTransparent?.()}
          >
            Aucun
          </button>
        )}
      </div>

      {/* Popover */}
      {open && !isTransparent && (
        <div className="absolute left-0 top-9 z-50 p-3 bg-surface-2 border border-surface-5 rounded-xl shadow-xl flex flex-col gap-2">
          <HexColorPicker color={hex} onChange={handlePickerChange} />
          <input
            className="input font-mono text-xs text-center"
            value={hex}
            onChange={handleHexInput}
          />
        </div>
      )}
    </div>
  )
}
