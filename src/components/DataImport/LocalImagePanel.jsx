import { useState } from 'react'
import {
  FolderOpen, HardDrive, Check, RefreshCw, X, Image as ImageIcon,
  ChevronDown, ChevronRight
} from 'lucide-react'
import {
  pickImageFolder, hasLocalImages, getLocalFolderName,
  getLocalImageCount, clearLocalImages, isSupported, preloadImages,
} from '../../utils/localImages'
import { buildImageUrl } from '../../utils/imageUrl'
import useCatalogStore from '../../store/catalogStore'

export default function LocalImagePanel() {
  const { imageBasePath, setImageBasePath, imageColumn, imageExtension, rawData } = useCatalogStore()
  const [expanded, setExpanded] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  // Force re-render after folder pick
  const [, setTick] = useState(0)

  const isLocal = imageBasePath === '__local__'
  const isActive = isLocal && hasLocalImages()

  const handlePickFolder = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await pickImageFolder()
      setImageBasePath('__local__')

      // Pre-warm cache with the first batch of images
      if (imageColumn && rawData.length > 0) {
        const filenames = rawData.slice(0, 100).map(row => {
          const val = String(row[imageColumn] ?? '').trim()
          const filename = val.replace(/^.*[\\/]/, '')
          const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(filename)
          return filename + (hasExt ? '' : imageExtension)
        }).filter(Boolean)
        await preloadImages(filenames)
      }

      setTick(t => t + 1) // trigger re-render
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Impossible de lire le dossier.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    clearLocalImages()
    setImageBasePath('http://localhost:3001/')
    setTick(t => t + 1)
  }

  if (!isSupported()) {
    return (
      <div className="rounded-xl border border-surface-5 overflow-hidden">
        <div className="px-4 py-3 bg-surface-3 flex items-center gap-3">
          <HardDrive size={14} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-400">Images locales</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400">Chrome requis</span>
        </div>
        <div className="px-4 py-3 bg-surface-2 text-xs text-gray-600">
          La lecture directe de dossiers necessite Chrome ou Edge.
        </div>
      </div>
    )
  }

  // Sample image preview
  const sampleRow = rawData[0]
  const sampleVal = sampleRow && imageColumn ? sampleRow[imageColumn] : null
  const sampleUrl = isActive && sampleVal ? buildImageUrl(sampleVal, '__local__', imageExtension) : null

  return (
    <div className="rounded-xl border border-surface-5 overflow-hidden">
      {/* Header */}
      <div
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface-3 hover:bg-surface-4 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <HardDrive size={14} className={isActive ? 'text-emerald-400' : 'text-gray-500'} />
        <span className="text-sm font-medium text-gray-200 flex-1">Images depuis le disque</span>

        {isActive && (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-medium">
            {getLocalImageCount()} images
          </span>
        )}

        {expanded ? <ChevronDown size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
      </div>

      {expanded && (
        <div className="px-4 py-4 bg-surface-2 flex flex-col gap-4">

          {/* Folder picker */}
          {!isActive ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Chargez vos images directement depuis un dossier sur votre ordinateur.
                Aucun serveur requis.
              </p>
              <button
                className="flex items-center justify-center gap-2.5 px-4 py-3 border-2 border-dashed border-surface-5
                           hover:border-accent/50 rounded-xl text-sm text-gray-400 hover:text-gray-200
                           transition-colors disabled:opacity-50"
                onClick={handlePickFolder}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <FolderOpen size={16} />
                )}
                {loading ? 'Scan en cours...' : 'Choisir un dossier d\'images'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Active folder info */}
              <div className="flex items-start gap-3 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg">
                <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs text-emerald-300 leading-relaxed flex-1">
                  <p className="font-medium mb-0.5">Dossier charge</p>
                  <p className="text-emerald-500 font-mono">{getLocalFolderName()}/</p>
                  <p className="text-emerald-600 mt-0.5">{getLocalImageCount()} images detectees</p>
                </div>
                <button
                  className="p-1 rounded hover:bg-emerald-500/20 text-emerald-600 hover:text-emerald-400 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleClear() }}
                  title="Deconnecter"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Change folder */}
              <button
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-accent transition-colors"
                onClick={handlePickFolder}
                disabled={loading}
              >
                <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                Changer de dossier
              </button>

              {/* Sample preview */}
              {sampleUrl && (
                <div>
                  <label className="label mb-1.5 block">Apercu</label>
                  <div className="flex items-center gap-3 px-3 py-2 bg-surface-3 rounded-lg border border-surface-5">
                    <div className="w-10 h-10 rounded bg-surface-4 overflow-hidden shrink-0 flex items-center justify-center">
                      <img src={sampleUrl} alt="" className="w-full h-full object-contain"
                        onError={(e) => { e.target.style.display = 'none' }} />
                    </div>
                    <span className="font-mono text-[10px] text-gray-500 truncate flex-1">
                      {String(sampleVal).replace(/^.*[\\/]/, '')}
                    </span>
                    <ImageIcon size={12} className="text-emerald-500 shrink-0" />
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
