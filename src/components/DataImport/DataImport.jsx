import { useState, useCallback, useRef } from 'react'
import { Upload, FileSpreadsheet, X, Info, AlertTriangle, RefreshCw } from 'lucide-react'
import { parseFile } from '../../utils/excelParser'
import useCatalogStore from '../../store/catalogStore'
import Select from '../UI/Select'
import Divider from '../UI/Divider'
import ImageServerPanel from './ImageServerPanel'
import LocalImagePanel from './LocalImagePanel'

export default function DataImport() {
  const { rawData, columns, fileName, groupColumn, imageBasePath, imageColumn, imageExtension,
          setData, setGroupColumn, setImageBasePath, setImageColumn, setImageExtension, clearData } = useCatalogStore()

  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sheetNames, setSheetNames] = useState([])
  const [selectedSheet, setSelectedSheet] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [tablePage, setTablePage] = useState(0)
  const inputRef = useRef()

  const TABLE_PAGE_SIZE = 8

  const handleFile = useCallback(async (file, sheetName) => {
    setLoading(true)
    setError(null)
    try {
      const result = await parseFile(file, { sheetName })
      if (result.rows.length === 0) throw new Error('Le fichier est vide ou ne contient aucune donnée.')
      setData({ rows: result.rows, columns: result.columns, fileName: file.name })
      setSheetNames(result.sheetNames ?? [])
      setTablePage(0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [setData])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (file.name.match(/\.(xlsx?|xlsm|csv|tsv|ods)$/i)) {
      setPendingFile(file)
      handleFile(file)
    } else {
      setError('Format non supporté. Utilisez .xlsx, .xls, .csv ou .tsv')
    }
  }, [handleFile])

  const onFileInput = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    setPendingFile(file)
    handleFile(file)
  }, [handleFile])

  const onSheetChange = (sheet) => {
    setSelectedSheet(sheet)
    if (pendingFile) handleFile(pendingFile, sheet)
  }

  // Pagination for the data table
  const pageStart = tablePage * TABLE_PAGE_SIZE
  const pageRows = rawData.slice(pageStart, pageStart + TABLE_PAGE_SIZE)
  const totalTablePages = Math.ceil(rawData.length / TABLE_PAGE_SIZE)

  const hasData = rawData.length > 0

  return (
    <div className="flex flex-col gap-6 p-6 animate-fadeIn">
      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Import de données</h2>
        <p className="text-sm text-gray-500">Chargez votre base de données produits (Excel ou CSV)</p>
      </div>

      {/* ── Drop zone ───────────────────────────────────────── */}
      {!hasData ? (
        <div
          className={`relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed
            transition-all duration-200 py-16 cursor-pointer
            ${dragging ? 'border-accent bg-accent/10' : 'border-surface-6 hover:border-surface-6 hover:bg-surface-3/50'}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" className="hidden" accept=".xlsx,.xls,.xlsm,.csv,.tsv,.ods" onChange={onFileInput} />
          <div className={`p-4 rounded-2xl transition-colors ${dragging ? 'bg-accent/20' : 'bg-surface-4'}`}>
            <Upload size={28} className={dragging ? 'text-accent' : 'text-gray-500'} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-300">
              {dragging ? 'Relâchez pour charger' : 'Glissez votre fichier ici'}
            </p>
            <p className="text-xs text-gray-600 mt-1">ou cliquez pour parcourir — .xlsx, .xls, .csv, .tsv</p>
          </div>
          {loading && (
            <div className="absolute inset-0 bg-surface-2/80 flex items-center justify-center rounded-xl">
              <RefreshCw size={20} className="text-accent animate-spin" />
            </div>
          )}
        </div>
      ) : (
        /* ── File loaded badge ── */
        <div className="flex items-center gap-3 px-4 py-3 bg-surface-3 rounded-xl border border-surface-5">
          <div className="p-2 bg-accent/20 rounded-lg">
            <FileSpreadsheet size={18} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{fileName}</p>
            <p className="text-xs text-gray-500">{rawData.length} produits · {columns.length} colonnes</p>
          </div>
          <button className="btn-ghost text-xs gap-1.5" onClick={() => inputRef.current?.click()}>
            <RefreshCw size={12} /> Remplacer
          </button>
          <button className="btn-icon text-gray-600 hover:text-red-400" onClick={clearData}>
            <X size={16} />
          </button>
          <input ref={inputRef} type="file" className="hidden" accept=".xlsx,.xls,.xlsm,.csv,.tsv,.ods" onChange={onFileInput} />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Sheet selector (multi-sheet excel) ── */}
      {sheetNames.length > 1 && (
        <div>
          <label className="label mb-2 block">Feuille active</label>
          <Select
            value={selectedSheet ?? sheetNames[0]}
            onChange={onSheetChange}
            options={sheetNames.map((s) => ({ value: s, label: s }))}
            placeholder={null}
          />
        </div>
      )}

      {hasData && (
        <>
          <Divider />

          {/* ── Column mapping ───────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label mb-2 block">Colonne de regroupement</label>
              <Select
                value={groupColumn ?? ''}
                onChange={setGroupColumn}
                options={columns.map((c) => ({ value: c, label: c }))}
                placeholder="Aucun regroupement"
              />
              <p className="text-xs text-gray-600 mt-1.5">Chaque valeur unique = une section</p>
            </div>

            <div>
              <label className="label mb-2 block">Colonne image produit</label>
              <Select
                value={imageColumn ?? ''}
                onChange={setImageColumn}
                options={columns.map((c) => ({ value: c, label: c }))}
                placeholder="Non définie"
              />
            </div>

            <div>
              <label className="label mb-2 block">Extension image</label>
              <Select
                value={imageExtension}
                onChange={setImageExtension}
                options={['.jpg', '.jpeg', '.png', '.webp', '.gif'].map((e) => ({ value: e, label: e }))}
                placeholder={null}
              />
            </div>
          </div>

          {/* ── Image source panels ─────────────────────────────── */}
          <LocalImagePanel />
          <ImageServerPanel />

          <Divider />

          {/* ── Data table ───────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title mb-0">Aperçu des données</h3>
              <span className="text-xs text-gray-600">{rawData.length} lignes · {columns.length} colonnes</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-surface-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-4 border-b border-surface-5">
                    <th className="px-3 py-2 text-left text-gray-500 font-medium w-10">#</th>
                    {columns.map((col) => (
                      <th key={col} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {col}
                          {col === groupColumn && <span className="px-1 py-0.5 bg-accent/20 text-accent rounded text-[10px]">groupe</span>}
                          {col === imageColumn && <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px]">image</span>}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => (
                    <tr key={pageStart + i} className="border-b border-surface-4/50 hover:bg-surface-3/50 transition-colors">
                      <td className="px-3 py-2 text-gray-600">{pageStart + i + 1}</td>
                      {columns.map((col) => (
                        <td key={col} className="px-3 py-2 text-gray-300 max-w-[180px]">
                          <div className="truncate">{String(row[col] ?? '')}</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table pagination */}
            {totalTablePages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-3">
                <button
                  className="btn-ghost py-1"
                  disabled={tablePage === 0}
                  onClick={() => setTablePage(tablePage - 1)}
                >←</button>
                <span className="text-xs text-gray-500">
                  Page {tablePage + 1} / {totalTablePages}
                </span>
                <button
                  className="btn-ghost py-1"
                  disabled={tablePage >= totalTablePages - 1}
                  onClick={() => setTablePage(tablePage + 1)}
                >→</button>
              </div>
            )}
          </div>

          {/* ── Summary cards ───────────────────────────────── */}
          {groupColumn && (
            <GroupSummary rawData={rawData} groupColumn={groupColumn} />
          )}
        </>
      )}
    </div>
  )
}

function GroupSummary({ rawData, groupColumn }) {
  const groups = rawData.reduce((acc, row) => {
    const key = String(row[groupColumn] ?? '—')
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <h3 className="section-title">Répartition par groupe</h3>
      <div className="flex flex-col gap-1.5">
        {Object.entries(groups).map(([key, count]) => (
          <div key={key} className="flex items-center gap-3 px-3 py-2 bg-surface-3 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
            <span className="text-sm text-gray-300 flex-1 truncate">{key}</span>
            <span className="text-xs text-gray-500 shrink-0">{count} produit{count > 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
