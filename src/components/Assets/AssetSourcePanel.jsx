import * as Icons from 'lucide-react'
import { Check, RefreshCw, X, Shapes, ShieldCheck, AlertTriangle } from 'lucide-react'
import { listSupported } from '../../imageSources/registry'
import { ASSETS } from '../../imageSources/activeConnection'
import { useSourceConnection } from '../../hooks/useSourceConnection'
import useCatalogStore from '../../store/catalogStore'

function ProviderIcon({ name, ...props }) {
  const Cmp = Icons[name] ?? Icons.Image
  return <Cmp {...props} />
}

/**
 * Connexion du répertoire d'assets de mise en page — logos, icônes, badges,
 * fonds : tout visuel qui ne vient pas du fichier Excel.
 *
 * Distinct des photos produits : ni le même contenu, ni forcément le même
 * emplacement (produits sur un NAS, assets en local, par exemple).
 */
export default function AssetSourcePanel() {
  const { assetSource, setAssetSource, setAssetSourceConfig } = useCatalogStore()

  const providers = listSupported()
  const activeId = assetSource?.providerId ?? providers[0]?.id

  const {
    provider, conn, isConnected, busy, error, needsReconnect, count,
    connect, reconnect, disconnect,
  } = useSourceConnection(ASSETS, assetSource, setAssetSourceConfig)

  const selectProvider = (id) => {
    if (id === activeId) return
    disconnect()
    setAssetSource({ providerId: id, config: id === 'http' ? { baseUrl: assetSource?.config?.baseUrl ?? '' } : {} })
  }

  return (
    <div className="rounded-xl border border-surface-5 overflow-hidden">
      <div className="px-4 py-3 bg-surface-3 flex items-center gap-3">
        <Shapes size={14} className={isConnected ? 'text-emerald-400' : 'text-gray-500'} />
        <span className="text-sm font-medium text-gray-200 flex-1">Répertoire d’assets</span>
        {isConnected && count > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-medium">
            {count} fichiers
          </span>
        )}
      </div>

      <div className="px-4 py-4 bg-surface-2 flex flex-col gap-4">

        <div className="flex items-start gap-2 px-3 py-2 bg-accent/5 border border-accent/20 rounded-lg">
          <ShieldCheck size={13} className="text-accent mt-0.5 shrink-0" />
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Vos logos, icônes et badges restent chez vous : le projet n’enregistre
            que leur nom de fichier, jamais l’image elle-même.
          </p>
        </div>

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
            </button>
          ))}
        </div>

        {activeId === 'http' && (
          <div className="flex flex-col gap-2">
            <label className="label block">URL de base des assets</label>
            <input
              className="w-full bg-surface-3 border border-surface-5 rounded-lg px-3 py-2 text-sm text-gray-200
                         outline-none focus:border-accent transition-colors font-mono"
              placeholder="https://mon-nas.synology.me/assets/"
              value={assetSource?.config?.baseUrl ?? ''}
              onChange={(e) => setAssetSourceConfig({ baseUrl: e.target.value })}
              onBlur={connect}
            />
            <p className="text-[11px] text-gray-600">
              Une URL de base ne permet pas de parcourir les fichiers : vous saisirez
              leur nom à la main.
            </p>
          </div>
        )}

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

        {activeId !== 'http' && !isConnected && !needsReconnect && (
          <button
            className="flex items-center justify-center gap-2.5 px-4 py-3 border-2 border-dashed border-surface-5
                       hover:border-accent/50 rounded-xl text-sm text-gray-400 hover:text-gray-200
                       transition-colors disabled:opacity-50"
            onClick={connect}
            disabled={busy}
          >
            {busy ? <RefreshCw size={16} className="animate-spin" /> : <ProviderIcon name={provider?.icon} size={16} />}
            {busy ? 'Connexion…' : 'Connecter le dossier d’assets'}
          </button>
        )}

        {isConnected && (
          <div className="flex items-start gap-3 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg">
            <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-xs text-emerald-300 leading-relaxed flex-1 min-w-0">
              <p className="font-medium mb-0.5">Répertoire connecté</p>
              {conn?.folderName && <p className="text-emerald-500 font-mono truncate">{conn.folderName}</p>}
              {count > 0 && <p className="text-emerald-600 mt-0.5">{count} fichiers disponibles</p>}
            </div>
            {activeId !== 'http' && (
              <button className="btn-ghost text-[11px] gap-1 py-1" onClick={connect} disabled={busy} title="Changer de dossier">
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

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  )
}
