import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import useCatalogStore from '../../store/catalogStore'
import { buildFontFaceCSS } from '../FontLoader'
import { usePagination } from '../../hooks/usePagination'
import { calcVignetteDimensions } from '../../utils/layoutCalculator'
import PageCanvas from '../PagePreview/PageCanvas'

// Wait for all <img> elements inside a container to finish loading
function waitForImages(container, timeout = 8000) {
  const imgs = [...container.querySelectorAll('img')]
  if (imgs.length === 0) return Promise.resolve()
  const promises = imgs.map(img =>
    img.complete ? Promise.resolve() :
    new Promise(resolve => {
      const timer = setTimeout(resolve, timeout)
      img.onload  = () => { clearTimeout(timer); resolve() }
      img.onerror = () => { clearTimeout(timer); resolve() }
    })
  )
  return Promise.all(promises)
}

export default function ExportModal({ onClose }) {
  const { rawData, columns, grid, header, footer, groupColumn, projectName, customFonts } = useCatalogStore()
  const pages = usePagination(rawData, columns, grid, groupColumn)
  const dims = calcVignetteDimensions(grid, header, footer)

  const [quality, setQuality] = useState('high')  // 'standard' | 'high' | 'print'
  const [phase, setPhase] = useState('config')    // 'config' | 'exporting' | 'done' | 'error'
  const [progress, setProgress] = useState(0)
  const [currentLabel, setCurrentLabel] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const offscreenRef = useRef(null)
  const abortRef = useRef(false)

  const zoomForQuality = { standard: 150, high: 200, print: 300 }
  const zoom = zoomForQuality[quality]

  const handleExport = useCallback(async () => {
    abortRef.current = false
    setPhase('exporting')
    setProgress(0)

    // Give React time to mount the off-screen pages and load images
    await new Promise(r => setTimeout(r, 300))

    try {
      const pdf = new jsPDF({
        orientation: grid.orientation === 'landscape' ? 'l' : 'p',
        unit: 'mm',
        format: [dims.pageW, dims.pageH],
        compress: true,
      })

      for (let i = 0; i < pages.length; i++) {
        if (abortRef.current) break

        setCurrentLabel(`Page ${i + 1} / ${pages.length}`)
        setProgress(Math.round((i / pages.length) * 100))

        const el = offscreenRef.current?.querySelector(`[data-export-page="${i}"]`)
        if (!el) continue

        // Wait for all images in this page to finish loading
        await waitForImages(el)

        const canvas = await html2canvas(el, {
          scale: zoom / 100,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 10000,
          // Override "viewport" with the element's own dimensions so html2canvas
          // never clips content based on screen/window size (critical for off-screen rendering)
          windowWidth: el.scrollWidth,
          windowHeight: el.scrollHeight,
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0,
          onclone: (doc, clone) => {
            // Ensure fonts and layout are stable in the clone
            clone.querySelectorAll('img').forEach(img => {
              img.crossOrigin = 'anonymous'
            })
            // Inject custom @font-face rules into the cloned document
            if (customFonts.length > 0) {
              const styleEl = doc.createElement('style')
              styleEl.textContent = buildFontFaceCSS(customFonts)
              doc.head.appendChild(styleEl)
            }
          },
        })

        const imgData = canvas.toDataURL('image/jpeg', quality === 'print' ? 0.98 : 0.92)

        if (i > 0) pdf.addPage([dims.pageW, dims.pageH], grid.orientation === 'landscape' ? 'l' : 'p')
        pdf.addImage(imgData, 'JPEG', 0, 0, dims.pageW, dims.pageH)
      }

      if (!abortRef.current) {
        const filename = `${(projectName || 'catalogue').replace(/\s+/g, '_')}.pdf`
        pdf.save(filename)
        setProgress(100)
        setPhase('done')
      }
    } catch (err) {
      console.error('PDF export error:', err)
      setErrorMsg(err.message ?? 'Erreur inconnue')
      setPhase('error')
    }
  }, [pages, dims, grid, zoom, quality, projectName])

  const handleCancel = () => {
    abortRef.current = true
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-surface-2 border border-surface-5 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/15 rounded-lg">
              <FileText size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-100">Exporter en PDF</p>
              <p className="text-xs text-gray-500">{pages.length} page{pages.length > 1 ? 's' : ''} · {rawData.length} produits</p>
            </div>
          </div>
          {phase !== 'exporting' && (
            <button className="btn-icon" onClick={onClose}><X size={16} /></button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-5">

          {/* Config phase */}
          {phase === 'config' && (
            <>
              <div>
                <label className="label mb-3 block">Qualité d'export</label>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'standard', label: 'Standard',  sub: '150 DPI — rapide, fichier léger',  badge: null },
                    { id: 'high',     label: 'Haute',     sub: '200 DPI — bon compromis',          badge: 'Recommandé' },
                    { id: 'print',    label: 'Impression', sub: '300 DPI — qualité maximale, lent', badge: null },
                  ].map(opt => (
                    <label key={opt.id}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors
                        ${quality === opt.id
                          ? 'border-accent bg-accent/10'
                          : 'border-surface-5 hover:border-surface-6 bg-surface-3'}`}
                    >
                      <input
                        type="radio" name="quality" value={opt.id}
                        checked={quality === opt.id}
                        onChange={() => setQuality(opt.id)}
                        className="accent-accent"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-200">{opt.label}</span>
                          {opt.badge && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-accent/20 text-accent rounded-full">{opt.badge}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-3 rounded-lg border border-surface-5 text-xs text-gray-500">
                <span>Format :</span>
                <span className="text-gray-300 font-medium">{grid.pageFormat} {grid.orientation === 'landscape' ? 'Paysage' : 'Portrait'}</span>
                <span className="ml-auto">{dims.pageW.toFixed(0)} × {dims.pageH.toFixed(0)} mm</span>
              </div>
            </>
          )}

          {/* Exporting phase */}
          {phase === 'exporting' && (
            <div className="flex flex-col items-center gap-4 py-2">
              <Loader2 size={32} className="text-accent animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-200">Génération en cours…</p>
                <p className="text-xs text-gray-500 mt-1">{currentLabel}</p>
              </div>
              <div className="w-full bg-surface-4 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600">{progress}%</p>
            </div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <CheckCircle2 size={36} className="text-emerald-400" />
              <p className="text-sm font-medium text-gray-200">PDF généré avec succès !</p>
              <p className="text-xs text-gray-500">{pages.length} pages exportées</p>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <AlertCircle size={36} className="text-red-400" />
              <p className="text-sm font-medium text-gray-200">Échec de l'export</p>
              <p className="text-xs text-red-400 font-mono break-all">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-surface-4">
          {phase === 'config' && (
            <>
              <button className="btn-ghost text-sm" onClick={onClose}>Annuler</button>
              <button className="btn-primary text-sm gap-2" onClick={handleExport}>
                <Download size={14} /> Exporter
              </button>
            </>
          )}
          {phase === 'exporting' && (
            <button className="btn-ghost text-sm" onClick={handleCancel}>Annuler</button>
          )}
          {(phase === 'done' || phase === 'error') && (
            <>
              {phase === 'error' && (
                <button className="btn-ghost text-sm" onClick={() => setPhase('config')}>Réessayer</button>
              )}
              <button className="btn-primary text-sm" onClick={onClose}>Fermer</button>
            </>
          )}
        </div>
      </div>

      {/* ── Off-screen render container ── */}
      {(phase === 'config' || phase === 'exporting') && (
        <div
          ref={offscreenRef}
          style={{
            position: 'absolute',
            top: 0,
            left: '-99999px',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          {pages.map((page, i) => (
            <div key={i} data-export-page={i}>
              <PageCanvas pageData={page} zoom={zoom} totalPages={pages.length} showGuides={false} />
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}
