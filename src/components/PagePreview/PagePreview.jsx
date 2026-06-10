import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookOpen, Download } from 'lucide-react'
import useCatalogStore from '../../store/catalogStore'
import { usePagination } from '../../hooks/usePagination'
import { useCtrlWheelZoom } from '../../hooks/useCtrlWheelZoom'
import PageCanvas from './PageCanvas'
import PageThumbnails from './PageThumbnails'
import ExportModal from '../Export/ExportModal'

const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 200, 250, 300]

export default function PagePreview() {
  const {
    rawData, columns, grid, header, footer, groupColumn,
    previewPage, previewZoom, setPreviewPage, setPreviewZoom,
  } = useCatalogStore()

  const [showExport, setShowExport] = useState(false)
  const pages = usePagination(rawData, columns, grid, groupColumn)
  const totalPages = pages.length
  const currentPage = pages[previewPage]

  // Ctrl/Cmd + molette → zoom continu (la valeur peut sortir de ZOOM_LEVELS)
  const canvasAreaRef = useRef(null)
  const applyZoom = useCallback((updater) => {
    const current = useCatalogStore.getState().previewZoom
    useCatalogStore.getState().setPreviewZoom(updater(current))
  }, [])
  useCtrlWheelZoom(canvasAreaRef, applyZoom, { min: 25, max: 300 })

  // Boutons : sauter au palier supérieur/inférieur le plus proche
  const zoomIn = () =>
    setPreviewZoom(ZOOM_LEVELS.find(z => z > previewZoom) ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1])
  const zoomOut = () =>
    setPreviewZoom([...ZOOM_LEVELS].reverse().find(z => z < previewZoom) ?? ZOOM_LEVELS[0])

  const goTo = (n) => {
    const clamped = Math.max(0, Math.min(n, totalPages - 1))
    setPreviewPage(clamped)
  }

  // No data state
  if (rawData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="p-5 bg-surface-3 rounded-2xl">
          <BookOpen size={32} className="text-gray-600" />
        </div>
        <div>
          <p className="text-gray-400 font-medium">Aucune donnée chargée</p>
          <p className="text-gray-600 text-sm mt-1">Importez un fichier Excel ou CSV pour générer le catalogue</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}

      {/* ── Thumbnails sidebar ─────────────────────────────────── */}
      <PageThumbnails pages={pages} currentPage={previewPage} onSelect={goTo} />

      {/* ── Main preview area ──────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── Toolbar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-2 border-b border-surface-4 shrink-0">

          {/* Page navigation */}
          <div className="flex items-center gap-1.5">
            <button className="btn-icon" onClick={() => goTo(previewPage - 1)} disabled={previewPage === 0}>
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              <input
                type="number"
                className="w-10 text-center bg-surface-3 border border-surface-5 rounded text-sm text-gray-200 py-0.5"
                value={previewPage + 1}
                min={1}
                max={totalPages}
                onChange={(e) => goTo(parseInt(e.target.value) - 1)}
              />
              <span className="text-sm text-gray-500">/ {totalPages}</span>
            </div>
            <button className="btn-icon" onClick={() => goTo(previewPage + 1)} disabled={previewPage >= totalPages - 1}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Page info */}
          {currentPage?.groupLabel && (
            <div className="flex items-center gap-2 px-3 py-1 bg-surface-3 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-xs text-gray-400">{currentPage.groupLabel}</span>
            </div>
          )}

          {/* Zoom controls + export */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1" title="Ctrl/Cmd + molette pour zoomer">
              <button className="btn-icon" onClick={zoomOut} disabled={previewZoom <= ZOOM_LEVELS[0]}>
                <ZoomOut size={16} />
              </button>
              <select
                className="bg-surface-3 border border-surface-5 rounded text-sm text-gray-300 px-2 py-0.5 cursor-pointer"
                value={previewZoom}
                onChange={(e) => setPreviewZoom(parseInt(e.target.value))}
              >
                {/* Valeur intermédiaire issue du zoom molette */}
                {!ZOOM_LEVELS.includes(previewZoom) && (
                  <option value={previewZoom}>{previewZoom}%</option>
                )}
                {ZOOM_LEVELS.map((z) => (
                  <option key={z} value={z}>{z}%</option>
                ))}
              </select>
              <button className="btn-icon" onClick={zoomIn} disabled={previewZoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}>
                <ZoomIn size={16} />
              </button>
            </div>

            <div className="w-px h-5 bg-surface-4" />

            <button
              className="btn-primary text-xs gap-1.5 py-1.5 px-3"
              onClick={() => setShowExport(true)}
            >
              <Download size={13} /> Exporter PDF
            </button>
          </div>
        </div>

        {/* ── Canvas area — mx-auto keeps the left edge scroll-reachable
               when the zoomed page is wider than the viewport ──────── */}
        <div
          ref={canvasAreaRef}
          className="flex-1 overflow-auto flex items-start py-8 px-6"
          style={{ background: '#1a1a1a' }}
        >
          {currentPage ? (
            <div className="page-enter mx-auto">
              <PageCanvas pageData={currentPage} zoom={previewZoom} totalPages={totalPages} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600">
              Page vide
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
