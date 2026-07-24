import { useState } from 'react'
import { MoreVertical, Copy, Trash2, Pencil, FileText, Package, Check, X } from 'lucide-react'

// Formatte un timestamp Firestore (ou number/Date) en date FR lisible.
function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts))
  try {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

export default function ProjectCard({ project, onOpen, onDuplicate, onDelete, onRename }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(project.name ?? 'Sans titre')

  const submitRename = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== project.name) onRename(project.id, trimmed)
    setRenaming(false)
  }

  return (
    <div className="group relative flex flex-col bg-surface-2 border border-surface-5 rounded-xl overflow-hidden
                    hover:border-accent/50 transition-colors">
      {/* Aperçu / thumbnail */}
      <button
        className="relative h-32 bg-surface-3 flex items-center justify-center overflow-hidden"
        onClick={() => onOpen(project.id)}
        title="Ouvrir le projet"
      >
        {project.thumbnail ? (
          <img src={project.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <FileText size={32} className="text-surface-6 group-hover:text-accent/50 transition-colors" />
        )}
      </button>

      {/* Infos */}
      <div className="flex flex-col gap-1 px-3 py-3">
        {renaming ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              className="flex-1 min-w-0 bg-surface-3 border border-accent/50 rounded px-2 py-1 text-sm text-gray-100 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenaming(false) }}
            />
            <button className="btn-icon !p-1 text-emerald-400" onClick={submitRename}><Check size={14} /></button>
            <button className="btn-icon !p-1 text-gray-500" onClick={() => setRenaming(false)}><X size={14} /></button>
          </div>
        ) : (
          <button className="text-left" onClick={() => onOpen(project.id)}>
            <p className="text-sm font-medium text-gray-100 truncate">{project.name ?? 'Sans titre'}</p>
          </button>
        )}
        <div className="flex items-center gap-2 text-[11px] text-gray-600">
          <span className="flex items-center gap-1"><Package size={11} /> {project.productCount ?? 0}</span>
          <span>·</span>
          <span>{formatDate(project.updatedAt)}</span>
        </div>
      </div>

      {/* Menu actions */}
      <div className="absolute top-2 right-2">
        <button
          className="p-1.5 rounded-lg bg-surface-1/70 backdrop-blur text-gray-400 hover:text-white
                     opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
        >
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 mt-1 z-20 w-40 bg-surface-3 border border-surface-5 rounded-lg shadow-xl py-1">
              <MenuItem icon={Pencil} label="Renommer" onClick={() => { setMenuOpen(false); setRenaming(true) }} />
              <MenuItem icon={Copy} label="Dupliquer" onClick={() => { setMenuOpen(false); onDuplicate(project.id) }} />
              <MenuItem icon={Trash2} label="Supprimer" danger
                onClick={() => { setMenuOpen(false); onDelete(project.id) }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left
        ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-surface-4'}`}
      onClick={onClick}
    >
      <Icon size={13} /> {label}
    </button>
  )
}
