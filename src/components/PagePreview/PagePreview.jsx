import { useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookOpen, Download } from 'lucide-react'
import useCatalogStore from '../../store/catalogStore'
import { usePagination } from '../../hooks/usePagination'
import PageCanvas from './PageCanvas'
import PageThumbnails from './PageThumbnails'
import ExportModal from '../Export/ExportModal'

const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150]

export default function PagePreview() {
  const {
    rawData, columns, grid, header, footer, groupColumn,
    previewPage, previewZoom, setPreviewPage, setPreviewZoom,
  } = useCatalogStore()

  const [showExport, setShowExport] = useState(false)
  const pages = usePagination(rawData, columns, grid, groupColumn)
  const totalPages = pages.length
  const currentPage = pages[previewPage]

  const zoomIdx = ZOOM_LEVELS.indexOf(previewZoom)

  const zoomIn = () => {
    const next = ZOOM_LEVELS[Math.min(zoomIdx + 1, ZOOM_LEVELS.length - 1)]
    setPreviewZoom(next)
  }
  const zoomOut = () => {
    const prev = ZOOM_LEVELS[Math.max(zoomIdx - 1, 0)]
    setPreviewZoom(prev)
  }

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
            <div className="flex items-center gap-1">
              <button className="btn-icon" onClick={zoomOut} disabled={zoomIdx === 0}>
                <ZoomOut size={16} />
              </button>
              <select
                className="bg-surface-3 border border-surface-5 rounded text-sm text-gray-300 px-2 py-0.5 cursor-pointer"
                value={previewZoom}
                onChange={(e) => setPreviewZoom(parseInt(e.target.value))}
              >
                {ZOOM_LEVELS.map((z) => (
                  <option key={z} value={z}>{z}%</option>
                ))}
              </select>
              <button className="btn-icon" onClick={zoomIn} disabled={zoomIdx === ZOOM_LEVELS.length - 1}>
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

        {/* ── Canvas area ─────────────────────────────────────── */}
        <div
          className="flex-1 overflow-auto flex items-start justify-center py-8 px-6"
          style={{ background: '#1a1a1a' }}
        >
          {currentPage ? (
            <div className="page-enter">
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
