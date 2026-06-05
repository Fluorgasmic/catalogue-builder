import { useState, useRef } from 'react'
import { Type, Image, Tag, Minus, AlignLeft, Plus, X, Layers, ChevronDown, ChevronUp, Upload } from 'lucide-react'
import useCatalogStore from '../../store/catalogStore'
import Select from '../UI/Select'
import NumberInput from '../UI/NumberInput'
import Toggle from '../UI/Toggle'
import Divider from '../UI/Divider'
import ColorPicker from './ColorPicker'

const FONT_WEIGHTS = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semi-bold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Heavy' },
]

const BUILTIN_FONTS = [
  'inherit', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Raleway', 'Oswald', 'Merriweather', 'Playfair Display', 'Source Sans Pro',
]

function getFontFormat(fileName) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'woff2') return 'woff2'
  if (ext === 'woff') return 'woff'
  return 'truetype'
}

const FIT_OPTIONS = [
  { value: 'contain', label: 'Contenir' },
  { value: 'cover',   label: 'Couvrir' },
  { value: 'fill',    label: 'Étirer' },
]

const CONDITION_OPS = [
  { value: '==',       label: '= égal à' },
  { value: '!=',       label: '≠ différent de' },
  { value: 'contains', label: '∋ contient' },
  { value: 'notempty', label: '≠ non vide' },
]

export default function BlockEditor({ block }) {
  const { updateBlock, columns, savedColors, addSavedColor, customFonts, addCustomFont, removeCustomFont } = useCatalogStore()

  if (!block) return <EmptyEditor />

  const update = (patch) => updateBlock(block.id, patch)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-surface-4 shrink-0">
        <BlockTypeIcon type={block.type} />
        <div>
          <p className="text-sm font-semibold text-white">{typeLabel(block.type)}</p>
          <p className="text-[10px] text-gray-600 font-mono">{block.id}</p>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-4">

        {/* ── Position mode ───────────────────────────────── */}
        <Section title="Position">
          <div className="flex gap-2 mb-3">
            {[['flow', '↓ Flux'], ['absolute', '⊹ Libre']].map(([mode, lbl]) => (
              <button
                key={mode}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  block.position === mode
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-surface-5 bg-surface-3 text-gray-500 hover:border-surface-6'
                }`}
                onClick={() => update({ position: mode })}
              >
                {lbl}
              </button>
            ))}
          </div>

          {block.position === 'absolute' && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="X (mm)"><NumberInput value={block.x ?? 0} onChange={v => update({ x: v })} step={0.5} /></Field>
              <Field label="Y (mm)"><NumberInput value={block.y ?? 0} onChange={v => update({ y: v })} step={0.5} /></Field>
              <Field label="Largeur"><NumberInput value={block.width ?? 0} onChange={v => update({ width: v || null })} step={0.5} unit="mm" /></Field>
              <Field label="Hauteur"><NumberInput value={block.height ?? 0} onChange={v => update({ height: v || null })} step={0.5} unit="mm" /></Field>
            </div>
          )}
        </Section>

        <Divider />

        {/* ── Type-specific ────────────────────────────────── */}
        {(block.type === 'text' || block.type === 'static') && (
          <TextProps block={block} update={update} columns={columns} savedColors={savedColors} addSavedColor={addSavedColor}
            customFonts={customFonts} addCustomFont={addCustomFont} removeCustomFont={removeCustomFont} />
        )}
        {block.type === 'image' && (
          <ImageProps block={block} update={update} columns={columns} />
        )}
        {block.type === 'badge' && (
          <BadgeProps block={block} update={update} columns={columns} />
        )}
        {block.type === 'separator' && (
          <SeparatorProps block={block} update={update} savedColors={savedColors} addSavedColor={addSavedColor} />
        )}
      </div>
    </div>
  )
}

// ─── Text / Static ────────────────────────────────────────────────────────────

function TextProps({ block, update, columns, savedColors, addSavedColor, customFonts, addCustomFont, removeCustomFont }) {
  const [showAdd, setShowAdd] = useState(false)
  const [newCol, setNewCol]   = useState('')
  const fontInputRef = useRef()

  const mappedCols  = block.columns ?? []
  const available   = columns.filter(c => !mappedCols.includes(c))

  const addColumn = (col) => {
    if (!col) return
    update({ columns: [...mappedCols, col] })
    setNewCol('')
    setShowAdd(false)
  }

  const removeColumn = (col) => update({ columns: mappedCols.filter(c => c !== col) })
  const moveUp       = (i)   => { const a = [...mappedCols]; [a[i-1], a[i]] = [a[i], a[i-1]]; update({ columns: a }) }
  const moveDown     = (i)   => { const a = [...mappedCols]; [a[i], a[i+1]] = [a[i+1], a[i]]; update({ columns: a }) }

  // Build font list: built-in + custom
  const allFonts = [
    ...BUILTIN_FONTS.map(f => ({ value: f, label: f === 'inherit' ? 'Par défaut' : f })),
    ...((customFonts ?? []).length > 0 ? [{ value: '__sep__', label: '── Polices perso ──', disabled: true }] : []),
    ...(customFonts ?? []).map(f => ({ value: f.name, label: `★ ${f.name}` })),
  ]

  const handleFontUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const format = getFontFormat(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      addCustomFont({ name, src: ev.target.result, format })
      update({ fontFamily: name })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <>
      {block.type === 'text' && (
        <Section title="Colonnes liées">
          {/* Empty state CTA */}
          {mappedCols.length === 0 && (
            <div className="mb-3 px-3 py-2.5 bg-accent/10 border border-accent/25 rounded-lg text-xs text-accent">
              Selectionnez une ou plusieurs colonnes a afficher dans ce bloc
            </div>
          )}

          {/* Mapped columns list */}
          <div className="flex flex-col gap-1 mb-2">
            {mappedCols.map((col, i) => (
              <div key={col} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-3 rounded-lg border border-surface-5">
                <span className="text-xs text-accent flex-1 truncate font-mono">{col}</span>
                <button className="p-0.5 text-gray-600 hover:text-gray-400 disabled:opacity-30" onClick={() => moveUp(i)} disabled={i === 0}><ChevronUp size={9}/></button>
                <button className="p-0.5 text-gray-600 hover:text-gray-400 disabled:opacity-30" onClick={() => moveDown(i)} disabled={i === mappedCols.length - 1}><ChevronDown size={9}/></button>
                <button className="p-0.5 text-gray-600 hover:text-red-400 transition-colors" onClick={() => removeColumn(col)}><X size={10} /></button>
              </div>
            ))}
          </div>

          {/* Add column */}
          {available.length > 0 && (
            showAdd ? (
              <div className="flex gap-1.5">
                <Select
                  value={newCol}
                  onChange={v => addColumn(v)}
                  options={available.map(c => ({ value: c, label: c }))}
                  placeholder="Choisir une colonne..."
                  className="flex-1 text-xs"
                />
                <button className="btn-icon bg-surface-3 border border-surface-5 rounded-lg px-2" onClick={() => setShowAdd(false)}>
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-surface-6
                           text-xs text-gray-500 hover:text-gray-300 hover:border-accent/50 transition-colors"
                onClick={() => setShowAdd(true)}
              >
                <Plus size={11} /> Ajouter une colonne
              </button>
            )
          )}

          {/* Separator if multiple columns */}
          {mappedCols.length > 1 && (
            <div className="mt-3">
              <Field label="Separateur entre colonnes">
                <input className="input text-xs" value={block.separator ?? ' '} onChange={e => update({ separator: e.target.value })} placeholder="espace, -, ..." />
              </Field>
            </div>
          )}

          {/* Prefix / Suffix */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label="Prefixe">
              <input className="input text-xs" value={block.prefix ?? ''} onChange={e => update({ prefix: e.target.value })} placeholder='ex: Prix: ' />
            </Field>
            <Field label="Suffixe">
              <input className="input text-xs" value={block.suffix ?? ''} onChange={e => update({ suffix: e.target.value })} placeholder='ex: EUR HTVA' />
            </Field>
          </div>
        </Section>
      )}

      {block.type === 'static' && (
        <Section title="Contenu">
          <textarea
            className="input text-xs resize-none"
            rows={3}
            value={block.staticText ?? ''}
            onChange={e => update({ staticText: e.target.value })}
            placeholder="Saisir le texte..."
          />
        </Section>
      )}

      <Divider />

      <Section title="Typographie">
        <div className="flex flex-col gap-3">
          <Field label="Police">
            <div className="flex gap-1.5">
              <Select
                value={block.fontFamily ?? 'inherit'}
                onChange={v => { if (v !== '__sep__') update({ fontFamily: v }) }}
                options={allFonts}
                placeholder={null}
                className="flex-1"
              />
              <button
                className="btn-icon bg-surface-3 border border-surface-5 rounded-lg px-2"
                title="Charger une police (.ttf, .woff, .woff2)"
                onClick={() => fontInputRef.current?.click()}
              >
                <Upload size={12} />
              </button>
              <input ref={fontInputRef} type="file" className="hidden" accept=".ttf,.woff,.woff2,.otf" onChange={handleFontUpload} />
            </div>
            {/* Custom font management */}
            {(customFonts ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {customFonts.map(f => (
                  <span key={f.name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-4 rounded text-[10px] text-gray-400">
                    {f.name}
                    <button className="text-gray-600 hover:text-red-400" onClick={() => removeCustomFont(f.name)}><X size={8} /></button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Taille">
              <NumberInput value={block.fontSize ?? 10} onChange={v => update({ fontSize: v })} min={5} max={72} step={0.5} unit="pt" />
            </Field>
            <Field label="Graisse">
              <Select value={block.fontWeight ?? 400} onChange={v => update({ fontWeight: parseInt(v) })} options={FONT_WEIGHTS} placeholder={null} />
            </Field>
          </div>

          <Field label="Alignement horizontal">
            <div className="flex gap-1">
              {[['left','G'], ['center','C'], ['right','D'], ['justify','J']].map(([a, icon]) => (
                <button
                  key={a}
                  className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                    block.align === a ? 'border-accent bg-accent/15 text-accent' : 'border-surface-5 bg-surface-3 text-gray-500 hover:border-surface-6'
                  }`}
                  title={a}
                  onClick={() => update({ align: a })}
                >{icon}</button>
              ))}
            </div>
          </Field>

          <Field label="Alignement vertical">
            <div className="flex gap-1">
              {[['top','Haut'], ['center','Centre'], ['bottom','Bas']].map(([v, lbl]) => (
                <button
                  key={v}
                  className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                    (block.vAlign ?? 'top') === v ? 'border-accent bg-accent/15 text-accent' : 'border-surface-5 bg-surface-3 text-gray-500 hover:border-surface-6'
                  }`}
                  onClick={() => update({ vAlign: v })}
                >{lbl}</button>
              ))}
            </div>
          </Field>

          <Toggle value={block.italic ?? false} onChange={v => update({ italic: v })} label="Italique" />

          <Field label="Couleur du texte">
            <ColorPicker color={block.color ?? '#111111'} onChange={c => update({ color: c })} savedColors={savedColors} onSaveColor={addSavedColor} />
          </Field>
        </div>
      </Section>

      <Divider />

      <Section title="Fond et bordures">
        <div className="flex flex-col gap-3">
          <Field label="Couleur de fond">
            <div className="flex items-center gap-2">
              <ColorPicker
                color={block.bgColor ?? 'transparent'}
                onChange={c => update({ bgColor: c })}
                savedColors={savedColors}
                onSaveColor={addSavedColor}
              />
              {block.bgColor && block.bgColor !== 'transparent' && (
                <button className="text-[10px] text-gray-600 hover:text-red-400" onClick={() => update({ bgColor: null })}>Retirer</button>
              )}
            </div>
          </Field>

          {block.bgColor && block.bgColor !== 'transparent' && (
            <>
              <Field label="Largeur du fond">
                <div className="flex gap-2">
                  {[['full', 'Vignette'], ['fit', 'Texte']].map(([mode, lbl]) => (
                    <button
                      key={mode}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        (block.widthMode ?? 'full') === mode
                          ? 'border-accent bg-accent/15 text-accent'
                          : 'border-surface-5 bg-surface-3 text-gray-500 hover:border-surface-6'
                      }`}
                      onClick={() => update({ widthMode: mode })}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Rayon de bord">
                <NumberInput value={block.bgBorderRadius ?? 0} onChange={v => update({ bgBorderRadius: v })} min={0} max={20} step={0.5} unit="mm" />
              </Field>
            </>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Espacement interne">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Haut/bas"><NumberInput value={block.paddingV ?? 2} onChange={v => update({ paddingV: v })} step={0.5} unit="mm" /></Field>
          <Field label="G/D"><NumberInput value={block.paddingH ?? 3} onChange={v => update({ paddingH: v })} step={0.5} unit="mm" /></Field>
        </div>
        <div className="mt-2">
          <Field label="Lignes max">
            <div className="flex items-center gap-2">
              <NumberInput
                value={block.maxLines ?? 1}
                onChange={v => update({ maxLines: Math.max(1, Math.round(v)) })}
                min={1} max={8} step={1}
              />
              <span className="text-xs text-gray-600">
                {(block.maxLines ?? 1) === 1 ? '-- tronque avec ...' : `-- ${block.maxLines ?? 1} lignes max`}
              </span>
            </div>
          </Field>
        </div>
      </Section>
    </>
  )
}

// ─── Image ────────────────────────────────────────────────────────────────────

function ImageProps({ block, update, columns }) {
  return (
    <Section title="Image produit">
      <div className="flex flex-col gap-3">
        <Field label="Colonne source">
          <Select
            value={block.imageColumn ?? ''}
            onChange={v => update({ imageColumn: v || null })}
            options={columns.map(c => ({ value: c, label: c }))}
            placeholder="Colonne image (par défaut)"
          />
        </Field>
        <Field label="Extension">
          <input className="input text-xs" value={block.extension ?? ''} onChange={e => update({ extension: e.target.value || null })} placeholder=".jpg, .png… (optionnel)" />
        </Field>

        <Divider />

        <Field label="Hauteur (% de la vignette)">
          <div className="flex items-center gap-3">
            <input
              type="range" min={10} max={100} step={1}
              value={block.heightPct ?? 50}
              onChange={e => update({ heightPct: parseInt(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm text-gray-300 w-10 text-right">{block.heightPct ?? 50}%</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">S'adapte automatiquement à toute taille de grille</p>
        </Field>

        <Field label="Ajustement">
          <Select value={block.fit ?? 'contain'} onChange={v => update({ fit: v })} options={FIT_OPTIONS} placeholder={null} />
        </Field>
      </div>
    </Section>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function BadgeProps({ block, update, columns }) {
  const fileRef = useRef()

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => update({ badgeSrc: ev.target.result })
    reader.readAsDataURL(file)
  }

  return (
    <Section title="Badge conditionnel">
      <div className="flex flex-col gap-3">
        <Field label="Image du badge">
          <div className="flex items-center gap-2">
            {block.badgeSrc ? (
              <img src={block.badgeSrc} alt="" className="w-10 h-10 object-contain bg-surface-3 rounded border border-surface-5 p-1" />
            ) : (
              <div className="w-10 h-10 bg-surface-3 rounded border border-dashed border-surface-6 flex items-center justify-center">
                <Image size={12} className="text-gray-600" />
              </div>
            )}
            <button className="btn-secondary text-xs" onClick={() => fileRef.current?.click()}>
              {block.badgeSrc ? 'Changer' : 'Charger…'}
            </button>
            {block.badgeSrc && (
              <button className="btn-icon text-gray-600 hover:text-red-400" onClick={() => update({ badgeSrc: null })}><X size={12} /></button>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
        </Field>

        <Divider />

        <p className="text-xs font-semibold text-gray-400">Condition d'affichage</p>
        <Field label="Colonne">
          <Select value={block.conditionColumn ?? ''} onChange={v => update({ conditionColumn: v || null })} options={columns.map(c => ({ value: c, label: c }))} placeholder="Choisir…" />
        </Field>
        <Field label="Opérateur">
          <Select value={block.conditionOperator ?? '=='} onChange={v => update({ conditionOperator: v })} options={CONDITION_OPS} placeholder={null} />
        </Field>
        {block.conditionOperator !== 'notempty' && (
          <Field label="Valeur attendue">
            <input className="input text-xs" value={block.conditionValue ?? ''} onChange={e => update({ conditionValue: e.target.value })} placeholder="ex: oui, bio, *…" />
          </Field>
        )}

        <Divider />

        <p className="text-xs font-semibold text-gray-400">Taille (% vignette)</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Largeur %"><NumberInput value={block.widthPct ?? 15} onChange={v => update({ widthPct: v })} min={2} max={80} unit="%" /></Field>
          <Field label="Hauteur %"><NumberInput value={block.heightPct ?? 15} onChange={v => update({ heightPct: v })} min={2} max={80} unit="%" /></Field>
        </div>
      </div>
    </Section>
  )
}

// ─── Separator ────────────────────────────────────────────────────────────────

function SeparatorProps({ block, update, savedColors, addSavedColor }) {
  return (
    <Section title="Séparateur">
      <div className="flex flex-col gap-3">
        <Field label="Épaisseur">
          <NumberInput value={block.thickness ?? 0.5} onChange={v => update({ thickness: v })} min={0.1} max={5} step={0.1} unit="mm" />
        </Field>
        <Field label="Couleur">
          <ColorPicker color={block.color ?? '#e5e7eb'} onChange={c => update({ color: c })} savedColors={savedColors} onSaveColor={addSavedColor} />
        </Field>
        <Field label="Largeur">
          <input className="input text-xs" value={block.separatorWidth ?? '100%'} onChange={e => update({ separatorWidth: e.target.value })} placeholder="100% ou 80mm…" />
        </Field>
        <Field label="Marge haut/bas">
          <NumberInput value={block.marginV ?? 2} onChange={v => update({ marginV: v })} min={0} max={20} step={0.5} unit="mm" />
        </Field>
      </div>
    </Section>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EmptyEditor() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
      <div className="p-4 bg-surface-3 rounded-2xl">
        <Layers size={24} className="text-gray-600" />
      </div>
      <p className="text-sm text-gray-500">Sélectionnez un bloc pour éditer ses propriétés</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      {title && <p className="section-title mb-3">{title}</p>}
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

function BlockTypeIcon({ type }) {
  const icons = { text: Type, image: Image, static: AlignLeft, badge: Tag, separator: Minus }
  const colors = { text: '#7C5CFC', image: '#3b82f6', static: '#10b981', badge: '#f59e0b', separator: '#6b7280' }
  const Icon = icons[type] ?? Layers
  const color = colors[type] ?? '#888'
  return (
    <span className="p-1.5 rounded-lg" style={{ backgroundColor: color + '25' }}>
      <Icon size={14} style={{ color }} />
    </span>
  )
}

function typeLabel(type) {
  return {
    text: 'Texte lié', image: 'Image produit', static: 'Texte statique',
    badge: 'Badge conditionnel', separator: 'Séparateur',
  }[type] ?? type
}
