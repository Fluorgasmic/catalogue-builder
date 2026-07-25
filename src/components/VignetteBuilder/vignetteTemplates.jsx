import { useState } from 'react'
import { Sparkles } from 'lucide-react'

// Templates are defined in VignetteBuilder (next to createBlock) and passed in,
// so the list and its block builders never drift apart.
export default function TemplatePicker({ templates, onApply }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="px-3 py-2 border-b border-surface-4">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-accent
                   bg-accent/10 hover:bg-accent/20 border border-accent/25 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Sparkles size={12} />
        {open ? 'Masquer les templates' : 'Choisir un template'}
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-1">
          {templates.map((tpl) => {
            const Icon = tpl.icon
            return (
              <button
                key={tpl.id}
                onClick={() => onApply(tpl.id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-surface-5
                           hover:border-accent/50 hover:bg-surface-3 transition-colors text-left"
              >
                <span className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-white"
                  style={{ backgroundColor: tpl.color }}>
                  <Icon size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-200 truncate">{tpl.name}</p>
                  <p className="text-[10px] text-gray-600 truncate">{tpl.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
