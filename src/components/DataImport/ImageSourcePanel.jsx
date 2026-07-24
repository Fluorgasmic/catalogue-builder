import { useState, useEffect } from 'react'
import * as Icons from 'lucide-react'
import { Check, RefreshCw, X, Image as ImageIcon, ShieldCheck, AlertTriangle } from 'lucide-react'
import { listSupported, get as getProvider } from '../../imageSources/registry'
import {
  getActiveConnection, setActiveConnection, clearActiveConnection, subscribeConnection,
} from '../../imageSources/activeConnection'
import { buildImageUrl } from '../../utils/imageUrl'
import useCatalogStore from '../../store/catalogStore'

// Icône lucide dynamique par nom
function ProviderIcon({ name, ...props }) {
  const Cmp = Icons[name] ?? Icons.Image
  return <Cmp {...props} />
}

export default function ImageSourcePanel() {
  const {
    imageSource, setImageSource, setImageSourceConfig, syncImageBasePath,
    imageColumn, imageExtension, rawData,
  } = useCatalogStore()

  const providers = listSupported()
  const activeId = imageSource?.providerId ?? providers[0]?.id
  const activeProvider = getProvider(activeId)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [needsReconnect, setNeedsReconnect] = useState(false)
  const [, setTick] = useState(0)

  // Re-render quand la connexion active change
  useEffect(() => subscribeConnection(() => setTick((t) => t + 1)), [])

  // Tentative de restauration au montage (reconnexion 1 clic si permission perdue)
  useEffect(() => {
    let cancelled = false
    async function tryRestore() {
      if (!activeProvider?.restore || getActiveConnection()) return
      try {
        const { connection, needsUserAction } = await activeProvider.restore(imageSource?.config ?? {})
        if (cancelled) return
        if (needsUserAction) {
          setNeedsReconnect(true)
          if (connection) setActiveConnection(connection) // garde le handle pour le regrant
        } else if (connection) {
          setActiveConnection(connection)
          syncImageBasePath()
        }
      } catch { /* silencieux */ }
    }
    tryRestore()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  const selectProvider = (id) => {
    if (id === activeId) return
    clearActiveConnection()
    setNeedsReconnect(false)
    setError(null)
    const cfg = id === 'http' ? { baseUrl: imageSource?.config?.baseUrl ?? '' } : {}
    setImageSource({ providerId: id, config: cfg })
    syncImageBasePath()
  }

  const connect = async () => {
    if (!activeProvider) return
    setBusy(true); setError(null); setNeedsReconnect(false)
    try {
      const conn = await activeProvider.connect(imageSource?.config ?? {})
      setActiveConnection(conn)
      setImageSourceConfig(activeProvider.serialize(conn))
      syncImageBasePath()
    } catch (err) {
      if (err?.name !== 'AbortError') setError('Connexion impossible à la source d’images.')
    } finally {
      setBusy(false)
      setTick((t) => t + 1)
    }
  }

  const reconnect = async () => {
    if (!activeProvider?.requestPermission) return connect()
    setBusy(true); setError(null)
    try {
      const conn = await activeProvider.requestPermission(getActiveConnection())
      if (conn) {
        setActiveConnection(conn)
        setImageSourceConfig(activeProvider.serialize(conn))
        setNeedsReconnect(false)
        syncImageBasePath()
      } else {
        setError('Permission refusée.')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setError('Reconnexion impossible.')
    } finally {
      setBusy(false); setTick((t) => t + 1)
    }
  }

  const disconnect = () => {
    const conn = getActiveConnection()
    if (conn && activeProvider) activeProvider.disconnect?.(conn)
    clearActiveConnection()
    setNeedsReconnect(false)
    setError(null)
    setTick((t) => t + 1)
  }

  const conn = getActiveConnection()
  const isConnected = !!conn && !needsReconnect && !conn.pending
  const count = isConnected && activeProvider ? activeProvider.count(conn) : 0

  // Aperçu échantillon
  const sampleVal = rawData[0] && imageColumn ? rawData[0][imageColumn] : null
  const basePath = useCatalogStore.getState().imageBasePath
  const sampleUrl = isConnected && sampleVal ? buildImageUrl(sampleVal, basePath, imageExtension) : null

  return (
    <div className="rounded-xl border border-surface-5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-surface-3 flex items-center gap-3">
        <ImageIcon size={14} className={isConnected ? 'text-emerald-400' : 'text-gray-500'} />
        <span className="text-sm font-medium text-gray-200 flex-1">Source des images</span>
        {isConnected && count > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-medium">
            {count} images
          </span>
        )}
      </div>

      <div className="px-4 py-4 bg-surface-2 flex flex-col gap-4">

        {/* Promesse produit */}
        <div className="flex items-start gap-2 px-3 py-2 bg-accent/5 border border-accent/20 rounded-lg">
          <ShieldCheck size={13} className="text-accent mt-0.5 shrink-0" />
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Vos images ne sont jamais copiées ni téléversées : Catalogue Builder ne fait que
            les afficher depuis votre propre stockage.
          </p>
        </div>

        {/* Chips de providers */}
        <div className="flex flex-wrap gap-2">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProvider(p.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${activeId === p.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-surface-5 bg-surface-3 text-gray-400 hover:text-gray-200 hover:border-surface-6'}`}
            >
              <ProviderIcon name={p.icon} size={13} />
              {p.label}
              {p.needsAuth && <span className="text-[9px] text-gray-600">OAuth</span>}
            </button>
          ))}
        </div>

        {activeProvider?.help && (
          <p className="text-[11px] text-gray-600 leading-relaxed -mt-1">{activeProvider.help}</p>
        )}

        {/* UI spécifique http : champ baseUrl */}
        {activeId === 'http' && (
          <div className="flex flex-col gap-2">
            <label className="label block">URL de base des images</label>
            <input
              className="w-full bg-surface-3 border border-surface-5 rounded-lg px-3 py-2 text-sm text-gray-200
                         outline-none focus:border-accent transition-colors font-mono"
              placeholder="https://mon-nas.synology.me/photos/"
              value={imageSource?.config?.baseUrl ?? ''}
              onChange={(e) => { setImageSourceConfig({ baseUrl: e.target.value }); syncImageBasePath() }}
              onBlur={connect}
            />
          </div>
        )}

        {/* Reconnexion 1 clic (permission perdue au rechargement) */}
        {needsReconnect && (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <span className="text-xs text-amber-300 flex-1">
              Reconnexion requise pour « {conn?.folderName} »
            </span>
            <button className="btn-primary text-xs py-1.5 px-3 gap-1.5" onClick={reconnect} disabled={busy}>
              <RefreshCw size={11} className={busy ? 'animate-spin' : ''} /> Reconnecter
            </button>
          </div>
        )}

        {/* Connexion pour providers non-http (local, cloud…) */}
        {activeId !== 'http' && !isConnected && !needsReconnect && (
          <button
            className="flex items-center justify-center gap-2.5 px-4 py-3 border-2 border-dashed border-surface-5
                       hover:border-accent/50 rounded-xl text-sm text-gray-400 hover:text-gray-200
                       transition-colors disabled:opacity-50"
            onClick={connect}
            disabled={busy}
          >
            {busy ? <RefreshCw size={16} className="animate-spin" /> : <ProviderIcon name={activeProvider?.icon} size={16} />}
            {busy ? 'Connexion…' : `Connecter ${activeProvider?.label ?? ''}`}
          </button>
        )}

        {/* État connecté */}
        {isConnected && (
          <div className="flex items-start gap-3 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg">
            <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-xs text-emerald-300 leading-relaxed flex-1 min-w-0">
              <p className="font-medium mb-0.5">Source connectée</p>
              {conn?.folderName && <p className="text-emerald-500 font-mono truncate">{conn.folderName}</p>}
              {count > 0 && <p className="text-emerald-600 mt-0.5">{count} images détectées</p>}
            </div>
            {activeId !== 'http' && (
              <button className="btn-ghost text-[11px] gap-1 py-1" onClick={connect} disabled={busy} title="Changer">
                <RefreshCw size={11} className={busy ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              className="p-1 rounded hover:bg-emerald-500/20 text-emerald-600 hover:text-emerald-400 transition-colors"
              onClick={disconnect} title="Déconnecter"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Aperçu échantillon */}
        {sampleUrl && (
          <div>
            <label className="label mb-1.5 block">Aperçu</label>
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

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  )
}
