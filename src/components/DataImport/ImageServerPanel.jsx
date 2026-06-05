// v2
import { useState } from 'react'
import { Server, Wifi, WifiOff, RefreshCw, ChevronDown, ChevronRight, Terminal, Copy, Check } from 'lucide-react'
import { useImageServer } from '../../hooks/useImageServer'
import useCatalogStore from '../../store/catalogStore'
import { buildImageUrl } from '../../utils/imageUrl'

export default function ImageServerPanel() {
  const { imageBasePath, setImageBasePath, imageColumn, imageExtension, rawData } = useCatalogStore()
  const { status, info, check } = useImageServer(imageBasePath)
  const [expanded, setExpanded] = useState(true)
  const [copied, setCopied]     = useState(false)

  // Build a sample image URL for preview
  const sampleRow    = rawData[0]
  const sampleVal    = sampleRow && imageColumn ? sampleRow[imageColumn] : '24100'
  const sampleUrl    = buildImageUrl(sampleVal, imageBasePath, imageExtension)

  const copyCmd = (cmd) => {
    navigator.clipboard.writeText(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const serverCmd = `node server/index.js --dir /chemin/vers/vos/images --port 3001`

  return (
    <div className="rounded-xl border border-surface-5 overflow-hidden">
      {/* ── Header ── */}
      <div
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface-3 hover:bg-surface-4 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Server size={14} className={
          status === 'online'   ? 'text-emerald-400' :
          status === 'checking' ? 'text-amber-400 animate-pulse' :
          'text-red-400'
        } />
        <span className="text-sm font-medium text-gray-200 flex-1">Serveur d'images local</span>

        {/* Status badge */}
        <StatusBadge status={status} />

        {/* Manual refresh */}
        <button
          className="btn-icon p-1"
          onClick={(e) => { e.stopPropagation(); check() }}
          title="Vérifier la connexion"
        >
          <RefreshCw size={12} className={status === 'checking' ? 'animate-spin' : ''} />
        </button>

        {expanded ? <ChevronDown size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
      </div>

      {expanded && (
        <div className="px-4 py-4 bg-surface-2 flex flex-col gap-4">

          {/* ── Base URL input ── */}
          <div>
            <label className="label mb-2 block">URL de base des images</label>
            <input
              className="input font-mono text-xs"
              value={imageBasePath}
              onChange={(e) => setImageBasePath(e.target.value)}
              placeholder="http://localhost:3001/"
            />
          </div>

          {/* ── Server online info ── */}
          {status === 'online' && info && (
            <div className="flex items-start gap-3 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg">
              <Wifi size={14} className="text-emerald-400 mt-0.5 shrink-0" />
              <div className="text-xs text-emerald-300 leading-relaxed">
                <p className="font-medium mb-0.5">Serveur connecté</p>
                <p className="text-emerald-500 font-mono truncate">{info.dir}</p>
              </div>
            </div>
          )}

          {/* ── Server offline: instructions ── */}
          {status === 'offline' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 px-3 py-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg">
                <WifiOff size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300 leading-relaxed">
                  Serveur non détecté sur <span className="font-mono">{imageBasePath}</span>.
                  Lancez-le depuis un terminal :
                </p>
              </div>

              {/* Terminal command */}
              <div className="rounded-lg bg-surface-0 border border-surface-5 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-surface-3 border-b border-surface-5">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Terminal size={11} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Terminal</span>
                  </div>
                  <button
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                    onClick={() => copyCmd(serverCmd)}
                  >
                    {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    {copied ? 'Copié !' : 'Copier'}
                  </button>
                </div>
                <div className="px-3 py-3 font-mono text-[11px] text-emerald-300 leading-relaxed">
                  <span className="text-gray-600">$ </span>
                  <span>{serverCmd}</span>
                </div>
              </div>

              {/* Quick path examples */}
              <div className="text-xs text-gray-600 space-y-1">
                <p className="font-medium text-gray-500 mb-1.5">Exemples de chemins :</p>
                {[
                  { path: '/Users/vous/Documents/images-produits', desc: 'macOS' },
                  { path: 'C:\\Users\\vous\\images-produits', desc: 'Windows' },
                  { path: '/home/vous/images-produits', desc: 'Linux' },
                ].map(({ path, desc }) => (
                  <div key={desc} className="flex items-center gap-2">
                    <span className="text-gray-700">{desc}</span>
                    <code className="text-gray-500 truncate">{path}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Sample URL preview ── */}
          {imageColumn && sampleRow && (
            <div>
              <label className="label mb-1.5 block">Aperçu URL construite</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-3 rounded-lg border border-surface-5">
                <span className="font-mono text-[11px] text-gray-400 flex-1 truncate">{sampleUrl}</span>
                {status === 'online' && (
                  <SampleImage src={sampleUrl} />
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const cfg = {
    online:   { label: 'En ligne',    cls: 'bg-emerald-500/20 text-emerald-400' },
    offline:  { label: 'Hors ligne',  cls: 'bg-red-500/20 text-red-400' },
    checking: { label: 'Vérification…', cls: 'bg-amber-500/20 text-amber-400' },
  }[status]

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function SampleImage({ src }) {
  const [ok, setOk] = useState(null)

  return (
    <div className="w-8 h-8 rounded bg-surface-4 overflow-hidden shrink-0 flex items-center justify-center">
      <img
        src={src}
        alt=""
        className="w-full h-full object-contain"
        onLoad={() => setOk(true)}
        onError={() => setOk(false)}
      />
      {ok === false && (
        <span className="text-[9px] text-red-400 text-center leading-tight px-0.5">introuvable</span>
      )}
    </div>
  )
}
