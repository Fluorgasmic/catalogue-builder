import { useState } from 'react'
import {
  Database, LayoutGrid, Eye, BookOpen, Download,
  FolderOpen, Save, Layers
} from 'lucide-react'
import useCatalogStore from './store/catalogStore'
import FontLoader from './components/FontLoader'
import DataImport from './components/DataImport/DataImport'
import GridSettings from './components/GridSettings/GridSettings'
import PagePreview from './components/PagePreview/PagePreview'
import VignetteBuilder from './components/VignetteBuilder/VignetteBuilder'
import HeaderFooterBuilder from './components/HeaderFooter/HeaderFooterBuilder'
import ExportModal from './components/Export/ExportModal'
import { usePagination } from './hooks/usePagination'

// ─── Sidebar nav items ────────────────────────────────────────────────────────

const NAV = [
  { id: 'import',   icon: Database,    label: 'Données',   group: 'build' },
  { id: 'vignette', icon: Layers,      label: 'Vignette',  group: 'build' },
  { id: 'grid',     icon: LayoutGrid,  label: 'Grille',    group: 'build' },
  { id: 'header',   icon: BookOpen,    label: 'En-tête & Pied',   group: 'build' },
  { id: 'preview',  icon: Eye,         label: 'Aperçu',    group: 'view'  },
]

export default function App() {
  const { activeTab, setActiveTab, rawData, columns, grid, groupColumn, projectName, setProjectName, exportProject, importProject } = useCatalogStore()

  const [showExport, setShowExport] = useState(false)
  const pages = usePagination(rawData, columns, grid, groupColumn)

  const handleSave = () => {
    const json = exportProject()
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${projectName.replace(/\s+/g, '_')}.catalogue.json`
    a.click()
  }

  const handleLoad = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const text = await file.text()
      const ok = importProject(text)
      if (!ok) alert('Fichier de projet invalide.')
    }
    input.click()
  }

  return (
    <div className="flex h-screen bg-surface-1 overflow-hidden">
      <FontLoader />

      {/* ══ Sidebar ══════════════════════════════════════════════ */}
      <aside className="flex flex-col w-56 bg-surface-2 border-r border-surface-4 shrink-0">

        {/* Logo / App name */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-4">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center shrink-0">
            <BookOpen size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-white tracking-wide">CATALOGUE</p>
            <p className="text-[10px] text-gray-600">Builder v0.1</p>
          </div>
        </div>

        {/* Project name */}
        <div className="px-3 py-2 border-b border-surface-4">
          <input
            className="w-full bg-transparent text-xs text-gray-400 hover:text-gray-200 focus:text-gray-100 outline-none truncate"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Nom du projet"
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <div className="px-3 mb-1">
            <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider mb-2">Construction</p>
          </div>
          {NAV.filter((n) => n.group === 'build').map((item) => (
            <NavItem key={item.id} item={item} active={activeTab === item.id} onClick={() => setActiveTab(item.id)} />
          ))}

          <div className="px-3 mt-4 mb-1">
            <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider mb-2">Visualisation</p>
          </div>
          {NAV.filter((n) => n.group === 'view').map((item) => (
            <NavItem key={item.id} item={item} active={activeTab === item.id} onClick={() => setActiveTab(item.id)} />
          ))}
        </nav>

        {/* Stats */}
        {rawData.length > 0 && (
          <div className="px-3 py-3 border-t border-surface-4 space-y-1.5">
            <Stat label="Produits" value={rawData.length} />
            <Stat label="Pages générées" value={pages.length} accent />
            <Stat label="Vignettes / page" value={grid.columns * grid.rows} />
          </div>
        )}

        {/* Project actions */}
        <div className="px-3 py-3 border-t border-surface-4 flex gap-2">
          <button className="btn-icon flex-1 justify-center" onClick={handleSave} title="Sauvegarder le projet">
            <Save size={14} />
          </button>
          <button className="btn-icon flex-1 justify-center" onClick={handleLoad} title="Ouvrir un projet">
            <FolderOpen size={14} />
          </button>
          <button
            className="btn-icon flex-1 justify-center"
            title="Exporter en PDF"
            disabled={rawData.length === 0}
            onClick={() => setShowExport(true)}
          >
            <Download size={14} />
          </button>
        </div>
      </aside>

      {/* Export modal */}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}

      {/* ══ Main content ═══════════════════════════════════════════ */}
      <main className="flex-1 overflow-hidden flex flex-col">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-surface-2 border-b border-surface-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {NAV.find((n) => n.id === activeTab)?.label ?? 'Catalogue Builder'}
            </span>
            {rawData.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] bg-surface-4 text-gray-500 rounded-full">
                {rawData.length} produits
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Breadcrumb of pages */}
            {pages.length > 0 && (
              <span className="text-xs text-gray-600">
                {pages.length} page{pages.length > 1 ? 's' : ''}
              </span>
            )}
            <button
              className="btn-primary text-xs py-1.5 px-3"
              onClick={() => setActiveTab('preview')}
            >
              <Eye size={12} /> Aperçu
            </button>
          </div>
        </div>

        {/* ── Panel area ────────────────────────────────────────── */}
        {(activeTab === 'preview' || activeTab === 'vignette' || activeTab === 'header') ? (
          <div className="flex-1 overflow-hidden">
            {activeTab === 'preview'  && <PagePreview />}
            {activeTab === 'vignette' && <VignetteBuilder />}
            {activeTab === 'header'   && <HeaderFooterBuilder />}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'import'   && <DataImport />}
            {activeTab === 'grid'     && <GridSettings />}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function NavItem({ item, active, onClick }) {
  const Icon = item.icon
  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left
        ${active
          ? 'bg-accent/15 text-accent border-r-2 border-accent'
          : 'text-gray-500 hover:text-gray-300 hover:bg-surface-3'
        }`}
      onClick={onClick}
    >
      <Icon size={16} />
      {item.label}
    </button>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-gray-600">{label}</span>
      <span className={`text-[11px] font-semibold ${accent ? 'text-accent' : 'text-gray-400'}`}>{value}</span>
    </div>
  )
}

function PlaceholderPanel({ label, desc, icon }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 gap-4 text-center px-8 animate-fadeIn">
      <div className="p-5 bg-surface-3 rounded-2xl">{icon}</div>
      <div>
        <p className="text-gray-300 font-semibold">{label}</p>
        <p className="text-gray-600 text-sm mt-1">{desc}</p>
      </div>
    </div>
  )
}
