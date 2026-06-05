import { useMemo } from 'react'
import { LayoutGrid, Settings2 } from 'lucide-react'
import useCatalogStore from '../../store/catalogStore'
import NumberInput from '../UI/NumberInput'
import Select from '../UI/Select'
import Divider from '../UI/Divider'
import { calcVignetteDimensions, PAGE_FORMATS } from '../../utils/layoutCalculator'

const GRID_PRESETS = [
  { label: '1×1', cols: 1, rows: 1, desc: '1 grande vignette / page' },
  { label: '1×2', cols: 1, rows: 2, desc: '2 vignettes / page' },
  { label: '1×3', cols: 1, rows: 3, desc: '3 vignettes / page' },
  { label: '2×2', cols: 2, rows: 2, desc: '4 vignettes / page' },
  { label: '2×3', cols: 2, rows: 3, desc: '6 vignettes / page' },
  { label: '2×4', cols: 2, rows: 4, desc: '8 vignettes / page' },
  { label: '3×3', cols: 3, rows: 3, desc: '9 vignettes / page' },
  { label: '2×5', cols: 2, rows: 5, desc: '10 vignettes / page' },
  { label: '3×4', cols: 3, rows: 4, desc: '12 vignettes / page' },
]

export default function GridSettings() {
  const { grid, setGrid, setMargins, header, footer } = useCatalogStore()

  const dims = useMemo(() => calcVignetteDimensions(grid, header, footer), [grid, header, footer])

  const isPresetActive = (p) => p.cols === grid.columns && p.rows === grid.rows

  return (
    <div className="flex flex-col gap-6 p-6 animate-fadeIn">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Grille & Mise en page</h2>
        <p className="text-sm text-gray-500">Définissez le format, la grille de vignettes et les marges</p>
      </div>

      {/* ── Format & Orientation ─────────────────────────────── */}
      <div>
        <h3 className="section-title">Format de page</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label mb-2 block">Format</label>
            <Select
              value={grid.pageFormat}
              onChange={(v) => setGrid({ pageFormat: v })}
              placeholder={null}
              options={Object.keys(PAGE_FORMATS).map((k) => ({ value: k, label: k }))}
            />
          </div>
          <div>
            <label className="label mb-2 block">Orientation</label>
            <div className="flex gap-2">
              {['portrait', 'landscape'].map((o) => (
                <button
                  key={o}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    grid.orientation === o
                      ? 'border-accent bg-accent/20 text-accent'
                      : 'border-surface-5 bg-surface-3 text-gray-400 hover:border-surface-6'
                  }`}
                  onClick={() => setGrid({ orientation: o })}
                >
                  {o === 'portrait' ? '▯ Portrait' : '▭ Paysage'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* ── Grid presets ─────────────────────────────────────── */}
      <div>
        <h3 className="section-title">Grille de vignettes</h3>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {GRID_PRESETS.map((p) => (
            <button
              key={p.label}
              className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs transition-all ${
                isPresetActive(p)
                  ? 'border-accent bg-accent/15 text-white'
                  : 'border-surface-5 bg-surface-3 text-gray-400 hover:border-surface-6 hover:text-gray-300'
              }`}
              onClick={() => setGrid({ columns: p.cols, rows: p.rows })}
            >
              <GridIcon cols={p.cols} rows={p.rows} active={isPresetActive(p)} />
              <span className="font-semibold">{p.label}</span>
              <span className="text-gray-600 text-[10px] text-center leading-tight">{p.desc}</span>
            </button>
          ))}
        </div>

        {/* Custom grid */}
        <div className="p-3 bg-surface-3 rounded-xl border border-surface-5">
          <p className="text-xs text-gray-500 mb-3 flex items-center gap-2">
            <Settings2 size={12} /> Configuration libre
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label mb-2 block">Colonnes</label>
              <NumberInput value={grid.columns} onChange={(v) => setGrid({ columns: Math.max(1, Math.min(6, v)) })} min={1} max={6} />
            </div>
            <div>
              <label className="label mb-2 block">Lignes</label>
              <NumberInput value={grid.rows} onChange={(v) => setGrid({ rows: Math.max(1, Math.min(8, v)) })} min={1} max={8} />
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* ── Margins ──────────────────────────────────────────── */}
      <div>
        <h3 className="section-title">Marges de page</h3>
        <div className="grid grid-cols-2 gap-3">
          {[['top', 'Haut'], ['bottom', 'Bas'], ['left', 'Gauche'], ['right', 'Droite']].map(([k, label]) => (
            <div key={k}>
              <label className="label mb-2 block">{label}</label>
              <NumberInput
                value={grid.margins[k]}
                onChange={(v) => setMargins({ [k]: v })}
                min={0} max={50} step={0.5} unit="mm"
              />
            </div>
          ))}
        </div>
      </div>

      <Divider />

      {/* ── Gutters ───────────────────────────────────────────── */}
      <div>
        <h3 className="section-title">Gouttières</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label mb-2 block">Entre colonnes</label>
            <NumberInput value={grid.gutterH} onChange={(v) => setGrid({ gutterH: v })} min={0} max={30} step={0.5} unit="mm" />
          </div>
          <div>
            <label className="label mb-2 block">Entre lignes</label>
            <NumberInput value={grid.gutterV} onChange={(v) => setGrid({ gutterV: v })} min={0} max={30} step={0.5} unit="mm" />
          </div>
        </div>
      </div>

      <Divider />

      {/* ── Calculated vignette size ─────────────────────────── */}
      <div className="p-4 bg-surface-3 rounded-xl border border-surface-5">
        <h3 className="section-title mb-3">Dimensions calculées</h3>
        <div className="grid grid-cols-2 gap-3">
          <DimCard label="Page" value={`${dims.pageW} × ${dims.pageH} mm`} />
          <DimCard label="Zone utile" value={`${dims.usableWidth.toFixed(1)} × ${dims.usableHeight.toFixed(1)} mm`} />
          <DimCard label="Vignette" value={`${dims.vignetteWidth.toFixed(1)} × ${dims.vignetteHeight.toFixed(1)} mm`} accent />
          <DimCard label="Vignettes / page" value={`${grid.columns * grid.rows}`} />
        </div>
      </div>

      {/* ── Bleed visual reference ────────────────────────────── */}
      <div className="flex items-start gap-3 px-4 py-3 bg-surface-3 rounded-xl border border-surface-5">
        <div className="shrink-0 mt-0.5">
          <div className="w-10 h-12 border-2 border-dashed border-gray-600 relative">
            <div className="absolute inset-1 border border-surface-6 bg-surface-4" />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-300 mb-1">Repères de coupe</p>
          <p className="text-xs text-gray-600">Les bords de coupe et de fond perdu sont configurables dans l'export PDF. La zone pointillée externe représente le bord de coupe, la zone interne représente la zone imprimable.</p>
        </div>
      </div>
    </div>
  )
}

function GridIcon({ cols, rows, active }) {
  return (
    <div
      className="flex flex-col gap-0.5"
      style={{ width: Math.min(cols * 10, 32), height: Math.min(rows * 8, 32) }}
    >
      {Array.from({ length: Math.min(rows, 4) }).map((_, r) => (
        <div key={r} className="flex gap-0.5 flex-1">
          {Array.from({ length: Math.min(cols, 4) }).map((_, c) => (
            <div
              key={c}
              className={`flex-1 rounded-sm ${active ? 'bg-accent' : 'bg-surface-6'}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function DimCard({ label, value, accent }) {
  return (
    <div className={`px-3 py-2.5 rounded-lg ${accent ? 'bg-accent/10 border border-accent/30' : 'bg-surface-4'}`}>
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${accent ? 'text-accent' : 'text-gray-200'}`}>{value}</p>
    </div>
  )
}
