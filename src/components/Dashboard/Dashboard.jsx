import { useEffect } from 'react'
import { Plus, BookOpen, Loader2, FolderOpen, LayoutGrid, Upload } from 'lucide-react'
import useProjectsStore from '../../store/projectsStore'
import useCatalogStore from '../../store/catalogStore'
import ProjectCard from './ProjectCard'

export default function Dashboard() {
  const { uid, projects, loading, error, refresh, newProject, openProject, duplicate, remove, rename } = useProjectsStore()
  const { resetProject, importProject, exportProject, rawData } = useCatalogStore()

  useEffect(() => {
    if (uid) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  // Hydrate le catalogStore depuis les données Firestore d'un projet
  const hydrate = (data) => { importProject(data) }

  const handleNew = async () => {
    resetProject()
    const initial = JSON.parse(exportProject())
    await newProject('Nouveau catalogue', initial, hydrate)
  }

  const handleOpen = (id) => openProject(id, hydrate)

  // Import d'un fichier .json local → nouveau projet cloud
  const handleImportFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const text = await file.text()
      try {
        const data = JSON.parse(text)
        importProject(data)
        const initial = JSON.parse(exportProject())
        await newProject(data.projectName ?? 'Projet importé', initial, hydrate)
      } catch {
        alert('Fichier de projet invalide.')
      }
    }
    input.click()
  }

  return (
    <div className="h-screen overflow-y-auto bg-surface-1">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-surface-2/90 backdrop-blur border-b border-surface-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-wide">CATALOGUE BUILDER</p>
            <p className="text-[11px] text-gray-500">Mes catalogues</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-sm gap-2" onClick={handleImportFile}>
            <Upload size={14} /> Importer
          </button>
          <button className="btn-primary text-sm gap-2" onClick={handleNew}>
            <Plus size={14} /> Nouveau catalogue
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading && projects.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={28} className="text-accent animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onNew={handleNew} onImport={handleImportFile} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={handleOpen}
                onDuplicate={duplicate}
                onDelete={(id) => { if (confirm('Supprimer ce catalogue ? Cette action est irréversible.')) remove(id) }}
                onRename={rename}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onNew, onImport }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6 text-center animate-fadeIn">
      <div className="p-6 bg-surface-3 rounded-3xl">
        <LayoutGrid size={40} className="text-surface-6" />
      </div>
      <div>
        <p className="text-lg font-semibold text-gray-200">Aucun catalogue pour l'instant</p>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Créez votre premier catalogue à partir d'un fichier Excel ou CSV, ou importez un projet existant.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary gap-2" onClick={onNew}>
          <Plus size={16} /> Créer un catalogue
        </button>
        <button className="btn-ghost gap-2" onClick={onImport}>
          <FolderOpen size={16} /> Importer un projet
        </button>
      </div>
    </div>
  )
}
