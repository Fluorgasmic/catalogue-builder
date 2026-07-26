import { useState, useEffect, useMemo } from 'react'
import { Shapes, Search, X, Check, AlertTriangle } from 'lucide-react'
import useCatalogStore from '../../store/catalogStore'
import { ASSETS, subscribeConnection } from '../../imageSources/activeConnection'
import { listAssets, resolveAssetUrl } from '../../utils/assetUrl'

/**
 * Sélecteur d'asset : parcourt le répertoire connecté et affiche les vignettes.
 *
 * Quand la source ne sait pas énumérer son contenu (une simple URL de base),
 * on retombe sur la saisie du nom de fichier — le seul moyen possible dans ce cas.
 */
export default function AssetPicker({ value, onChange, onClose }) {
  const assetSource = useCatalogStore((s) => s.assetSource)
  const providerId = assetSource?.providerId
  const [filtre, setFiltre] = useState('')
  const [saisie, setSaisie] = useState(value ?? '')
  const [, setTick] = useState(0)

  // Le répertoire peut se connecter pendant que le sélecteur est ouvert.
  useEffect(() => subscribeConnection(() => setTick((t) => t + 1), ASSETS), [])

  const fichiers = listAssets(providerId)
  const peutParcourir = fichiers.length > 0

  const visibles = useMemo(() => {
    const q = filtre.trim().toLowerCase()
    return q ? fichiers.filter((f) => f.toLowerCase().includes(q)) : fichiers
  }, [fichiers, filtre])

  const choisir = (nom) => { onChange(nom); onClose?.() }

  return (
    <div className="rounded-xl border border-surface-5 bg-surface-2 overflow-hidden">
      <div className="px-3 py-2 bg-surface-3 flex items-center gap-2">
        <Shapes size={13} className="text-accent" />
        <span className="text-xs font-medium text-gray-200 flex-1">Choisir un asset</span>
        {onClose && (
          <button className="p-1 rounded hover:bg-surface-4 text-gray-500 hover:text-gray-200" onClick={onClose}>
            <X size={13} />
          </button>
        )}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {peutParcourir ? (
          <>
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-3 border border-surface-5 rounded-lg">
              <Search size={12} className="text-gray-600 shrink-0" />
              <input
                className="flex-1 bg-transparent text-xs text-gray-200 outline-none"
                placeholder={`Filtrer parmi ${fichiers.length} fichiers…`}
                value={filtre}
                onChange={(e) => setFiltre(e.target.value)}
              />
            </div>

            {visibles.length === 0 ? (
              <p className="text-[11px] text-gray-600 py-4 text-center">Aucun fichier ne correspond.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {visibles.map((nom) => (
                  <button
                    key={nom}
                    onClick={() => choisir(nom)}
                    title={nom}
                    className={`group relative rounded-lg border overflow-hidden transition-colors
                      ${value === nom
                        ? 'border-accent bg-accent/10'
                        : 'border-surface-5 bg-surface-3 hover:border-accent/50'}`}
                  >
                    <div className="aspect-square flex items-center justify-center bg-surface-4">
                      <AssetThumb nom={nom} providerId={providerId} />
                    </div>
                    <p className="px-1.5 py-1 text-[9px] text-gray-500 group-hover:text-gray-300 truncate text-left">
                      {nom}
                    </p>
                    {value === nom && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/25 rounded-lg">
              <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                {providerId === 'http'
                  ? "Une URL de base n’expose pas la liste de ses fichiers : saisissez le nom de l’asset."
                  : "Répertoire d’assets non connecté. Connectez-le dans l’onglet Données pour parcourir vos visuels."}
              </p>
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-surface-3 border border-surface-5 rounded-lg px-2.5 py-1.5 text-xs
                           text-gray-200 outline-none focus:border-accent transition-colors font-mono"
                placeholder="logo-entreprise.png"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && saisie.trim()) choisir(saisie.trim()) }}
              />
              <button
                className="btn-primary text-xs py-1.5 px-3"
                onClick={() => saisie.trim() && choisir(saisie.trim())}
                disabled={!saisie.trim()}
              >
                Valider
              </button>
            </div>
          </>
        )}

        {value && (
          <div className="flex items-center gap-2 pt-1 border-t border-surface-4">
            <span className="text-[10px] text-gray-600 shrink-0">Actuel :</span>
            <span className="font-mono text-[10px] text-gray-400 truncate flex-1">{value}</span>
            <button
              className="text-[10px] text-gray-600 hover:text-red-400 transition-colors shrink-0"
              onClick={() => { onChange(null); onClose?.() }}
            >
              Retirer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function AssetThumb({ nom, providerId }) {
  const url = resolveAssetUrl(nom, providerId)
  if (!url) return <Shapes size={16} className="text-gray-700" />
  return <img src={url} alt="" className="w-full h-full object-contain" loading="lazy" />
}
