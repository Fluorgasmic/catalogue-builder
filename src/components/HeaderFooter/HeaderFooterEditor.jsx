import { useState, useRef } from 'react'
import {
  AlignLeft, AlignCenter, AlignRight, Bold, Italic,
  Image as ImageIcon, X, Plus, Trash2, ChevronDown, ChevronUp,
  Hash, Upload
} from 'lucide-react'
import useCatalogStore from '../../store/catalogStore'
import Toggle from '../UI/Toggle'
import NumberInput from '../UI/NumberInput'
import ColorPickerInline from './ColorPickerInline'

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

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function HeaderFooterEditor() {
  const [activeSection, setActiveSection] = useState('header')

  return (
    <div className="flex h-full overflow-hidden">

      {/* Left: section tabs */}
      <div className="w-44 shrink-0 bg-surface-2 border-r border-surface-4 flex flex-col py-3 gap-1 px-2">
        <SectionTab id="header" active={activeSection === 'header'} onClick={() => setActiveSection('header')} label="En-tête" />
        <SectionTab id="footer" active={activeSection === 'footer'} onClick={() => setActiveSection('footer')} label="Pied de page" />
        <div className="mt-4 px-2">
          <p className="text-[10px] text-gray-700 leading-relaxed">
            L'en-tête et le pied de page s'affichent sur chaque page du catalogue.
          </p>
        </div>
      </div>

      {/* Right: editor */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'header' ? <HeaderEditor /> : <FooterEditor />}
      </div>
    </div>
  )
}

function SectionTab({ id, active, onClick, label }) {
  return (
    <button
      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
        ${active ? 'bg-accent/15 text-accent' : 'text-gray-500 hover:text-gray-300 hover:bg-surface-3'}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

// ─── Header editor ────────────────────────────────────────────────────────────

function HeaderEditor() {
  const { header, setHeader, columns, customFonts, addCustomFont } = useCatalogStore()
  const fontInputRef = useRef()

  const allFontOptions = [
    ...BUILTIN_FONTS.map(f => ({ value: f, label: f === 'inherit' ? 'Par defaut' : f })),
    ...((customFonts ?? []).length > 0 ? [{ value: '__sep__', label: '-- Polices perso --', disabled: true }] : []),
    ...(customFonts ?? []).map(f => ({ value: f.name, label: f.name })),
  ]

  const handleFontUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const format = getFontFormat(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      addCustomFont({ name, src: ev.target.result, format })
      setHeader({ title: { ...header.title, fontFamily: name } })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="p-5 flex flex-col gap-5 max-w-2xl">

      {/* Enable + height */}
      <Section title="En-tête">
        <div className="flex items-center justify-between">
          <Toggle value={header.enabled} onChange={(v) => setHeader({ enabled: v })} label="Activer l'en-tête" />
        </div>
        {header.enabled && (
          <div className="flex items-center gap-4 mt-3">
            <label className="label">Hauteur</label>
            <NumberInput
              value={header.height ?? 18}
              onChange={(v) => setHeader({ height: v })}
              min={5} max={60} step={0.5} unit="mm"
            />
          </div>
        )}
        {header.enabled && (
          <div className="flex items-center gap-4 mt-2">
            <label className="label">Espace après (avant vignettes)</label>
            <NumberInput
              value={header.spacingAfter ?? 0}
              onChange={(v) => setHeader({ spacingAfter: v })}
              min={0} max={30} step={0.5} unit="mm"
            />
          </div>
        )}
      </Section>

      {header.enabled && (
        <>
          {/* Title */}
          <Section title="Titre" collapsible defaultOpen>
            <Toggle
              value={header.title?.enabled ?? true}
              onChange={(v) => setHeader({ title: { ...header.title, enabled: v } })}
              label="Afficher le titre"
            />
            {(header.title?.enabled ?? true) && (
              <div className="mt-3 flex flex-col gap-3">
                {/* Source: column or static */}
                <div>
                  <label className="label mb-1.5 block">Source du texte</label>
                  <div className="flex gap-2">
                    <select
                      className="input flex-1 text-xs"
                      value={header.title?.column ?? ''}
                      onChange={(e) => setHeader({ title: { ...header.title, column: e.target.value || null } })}
                    >
                      <option value="">— Texte statique —</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Static text (shown when no column selected) */}
                {!header.title?.column && (
                  <div>
                    <label className="label mb-1.5 block">Texte statique</label>
                    <input
                      className="input text-sm"
                      value={header.title?.staticText ?? ''}
                      onChange={(e) => setHeader({ title: { ...header.title, staticText: e.target.value } })}
                      placeholder="Ex: Mon catalogue produits"
                    />
                  </div>
                )}

                {/* Font family */}
                <div>
                  <label className="label mb-1.5 block">Police</label>
                  <div className="flex gap-1.5">
                    <select
                      className="input text-xs flex-1"
                      value={header.title?.fontFamily ?? 'inherit'}
                      onChange={(e) => { if (e.target.value !== '__sep__') setHeader({ title: { ...header.title, fontFamily: e.target.value } }) }}
                    >
                      {allFontOptions.map(f => (
                        <option key={f.value} value={f.value} disabled={f.disabled}>{f.label}</option>
                      ))}
                    </select>
                    <button
                      className="px-2 py-1.5 bg-surface-3 border border-surface-5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
                      title="Charger une police (.ttf, .woff, .woff2)"
                      onClick={() => fontInputRef.current?.click()}
                    >
                      <Upload size={12} />
                    </button>
                    <input ref={fontInputRef} type="file" className="hidden" accept=".ttf,.woff,.woff2,.otf" onChange={handleFontUpload} />
                  </div>
                </div>

                {/* Typography row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <label className="label mb-1.5 block">Taille</label>
                    <NumberInput
                      value={header.title?.fontSize ?? 14}
                      onChange={(v) => setHeader({ title: { ...header.title, fontSize: v } })}
                      min={6} max={48} step={0.5} unit="pt"
                    />
                  </div>
                  <div>
                    <label className="label mb-1.5 block">Graisse</label>
                    <select
                      className="input text-xs"
                      value={header.title?.fontWeight ?? 'bold'}
                      onChange={(e) => setHeader({ title: { ...header.title, fontWeight: e.target.value } })}
                    >
                      {[300,400,500,600,700,800,900].map(w => (
                        <option key={w} value={w === 400 ? 'normal' : w === 700 ? 'bold' : w}>{w}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label mb-1.5 block">Alignement</label>
                    <AlignButtons
                      value={header.title?.align ?? 'left'}
                      onChange={(v) => setHeader({ title: { ...header.title, align: v } })}
                    />
                  </div>
                  <div>
                    <label className="label mb-1.5 block">Couleur</label>
                    <ColorPickerInline
                      value={header.title?.color ?? '#111111'}
                      onChange={(v) => setHeader({ title: { ...header.title, color: v } })}
                    />
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Rule */}
          <Section title="Filet séparateur" collapsible defaultOpen>
            <Toggle
              value={header.rule?.enabled ?? true}
              onChange={(v) => setHeader({ rule: { ...header.rule, enabled: v } })}
              label="Afficher le filet"
            />
            {(header.rule?.enabled ?? true) && (
              <div className="mt-3 flex items-center gap-4 flex-wrap">
                <div>
                  <label className="label mb-1.5 block">Épaisseur</label>
                  <NumberInput
                    value={header.rule?.thickness ?? 1}
                    onChange={(v) => setHeader({ rule: { ...header.rule, thickness: v } })}
                    min={0.25} max={10} step={0.25} unit="pt"
                  />
                </div>
                <div>
                  <label className="label mb-1.5 block">Couleur</label>
                  <ColorPickerInline
                    value={header.rule?.color ?? '#7C5CFC'}
                    onChange={(v) => setHeader({ rule: { ...header.rule, color: v } })}
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Logo */}
          <Section title="Logo" collapsible>
            <Toggle
              value={header.logo?.enabled ?? false}
              onChange={(v) => setHeader({ logo: { ...header.logo, enabled: v } })}
              label="Afficher un logo"
            />
            {(header.logo?.enabled ?? false) && (
              <div className="mt-3 flex flex-col gap-3">
                <LogoUpload
                  src={header.logo?.src}
                  onChange={(src) => setHeader({ logo: { ...header.logo, src } })}
                />
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <label className="label mb-1.5 block">Position</label>
                    <div className="flex rounded-lg overflow-hidden border border-surface-5">
                      {['left', 'right'].map(pos => (
                        <button
                          key={pos}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors
                            ${header.logo?.position === pos ? 'bg-accent text-white' : 'bg-surface-3 text-gray-400 hover:text-gray-200'}`}
                          onClick={() => setHeader({ logo: { ...header.logo, position: pos } })}
                        >
                          {pos === 'left' ? 'Gauche' : 'Droite'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label mb-1.5 block">Largeur</label>
                    <NumberInput
                      value={header.logo?.width ?? 24}
                      onChange={(v) => setHeader({ logo: { ...header.logo, width: v } })}
                      min={5} max={80} step={1} unit="mm"
                    />
                  </div>
                  <div>
                    <label className="label mb-1.5 block">Hauteur</label>
                    <NumberInput
                      value={header.logo?.height ?? 10}
                      onChange={(v) => setHeader({ logo: { ...header.logo, height: v } })}
                      min={3} max={40} step={1} unit="mm"
                    />
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Secondary text */}
          <Section title="Texte secondaire" collapsible>
            <Toggle
              value={header.secondaryText?.enabled ?? false}
              onChange={(v) => setHeader({ secondaryText: { ...header.secondaryText, enabled: v } })}
              label="Afficher un texte secondaire"
            />
            {(header.secondaryText?.enabled ?? false) && (
              <div className="mt-3 flex flex-col gap-3">
                <input
                  className="input text-sm"
                  value={header.secondaryText?.text ?? ''}
                  onChange={(e) => setHeader({ secondaryText: { ...header.secondaryText, text: e.target.value } })}
                  placeholder="Sous-titre, slogan…"
                />
                <div>
                  <label className="label mb-1.5 block">Police</label>
                  <select
                    className="input text-xs"
                    value={header.secondaryText?.fontFamily ?? 'inherit'}
                    onChange={(e) => { if (e.target.value !== '__sep__') setHeader({ secondaryText: { ...header.secondaryText, fontFamily: e.target.value } }) }}
                  >
                    {allFontOptions.map(f => (
                      <option key={f.value} value={f.value} disabled={f.disabled}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="label mb-1.5 block">Taille</label>
                    <NumberInput
                      value={header.secondaryText?.fontSize ?? 9}
                      onChange={(v) => setHeader({ secondaryText: { ...header.secondaryText, fontSize: v } })}
                      min={6} max={24} step={0.5} unit="pt"
                    />
                  </div>
                  <div>
                    <label className="label mb-1.5 block">Couleur</label>
                    <ColorPickerInline
                      value={header.secondaryText?.color ?? '#9ca3af'}
                      onChange={(v) => setHeader({ secondaryText: { ...header.secondaryText, color: v } })}
                    />
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Background */}
          <Section title="Fond" collapsible>
            <div className="flex items-center gap-3">
              <label className="label">Couleur de fond</label>
              <ColorPickerInline
                value={header.bgColor === 'transparent' ? '#ffffff' : (header.bgColor ?? '#ffffff')}
                onChange={(v) => setHeader({ bgColor: v })}
                allowTransparent
                isTransparent={header.bgColor === 'transparent'}
                onTransparent={() => setHeader({ bgColor: 'transparent' })}
              />
            </div>
          </Section>

          <Section title="Marges de l'en-tête" collapsible>
            <p className="text-xs text-gray-600 mb-3">
              Par défaut, l'en-tête utilise les marges de la grille. Définissez des marges personnalisées pour que l'en-tête s'étende au-delà.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <label className="label mb-1.5 block">Marge gauche</label>
                <NumberInput
                  value={header.paddingLeft ?? ''}
                  onChange={(v) => setHeader({ paddingLeft: v })}
                  min={0} max={50} step={0.5} unit="mm"
                />
                {header.paddingLeft != null && (
                  <button className="mt-1 text-[10px] text-gray-600 hover:text-accent" onClick={() => setHeader({ paddingLeft: null })}>
                    Réinitialiser
                  </button>
                )}
              </div>
              <div>
                <label className="label mb-1.5 block">Marge droite</label>
                <NumberInput
                  value={header.paddingRight ?? ''}
                  onChange={(v) => setHeader({ paddingRight: v })}
                  min={0} max={50} step={0.5} unit="mm"
                />
                {header.paddingRight != null && (
                  <button className="mt-1 text-[10px] text-gray-600 hover:text-accent" onClick={() => setHeader({ paddingRight: null })}>
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
          </Section>
        </>
      )}
    </div>
  )
}

// ─── Footer editor ────────────────────────────────────────────────────────────

function FooterEditor() {
  const { footer, setFooter, columns, customFonts, addCustomFont } = useCatalogStore()
  const fontInputRef = useRef()

  const allFontOptions = [
    ...BUILTIN_FONTS.map(f => ({ value: f, label: f === 'inherit' ? 'Par defaut' : f })),
    ...((customFonts ?? []).length > 0 ? [{ value: '__sep__', label: '-- Polices perso --', disabled: true }] : []),
    ...(customFonts ?? []).map(f => ({ value: f.name, label: f.name })),
  ]

  const handleFontUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const format = getFontFormat(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      addCustomFont({ name, src: ev.target.result, format })
      setFooter({ pageNumber: { ...footer.pageNumber, fontFamily: name } })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const addNote = () => {
    const notes = [...(footer.conditionalNotes ?? [])]
    notes.push({ id: Date.now(), column: columns[0] ?? null, operator: '==', value: '', text: '' })
    setFooter({ conditionalNotes: notes })
  }

  const updateNote = (id, patch) => {
    const notes = (footer.conditionalNotes ?? []).map(n => n.id === id ? { ...n, ...patch } : n)
    setFooter({ conditionalNotes: notes })
  }

  const removeNote = (id) => {
    setFooter({ conditionalNotes: (footer.conditionalNotes ?? []).filter(n => n.id !== id) })
  }

  return (
    <div className="p-5 flex flex-col gap-5 max-w-2xl">

      {/* Enable + height */}
      <Section title="Pied de page">
        <div className="flex items-center justify-between">
          <Toggle value={footer.enabled} onChange={(v) => setFooter({ enabled: v })} label="Activer le pied de page" />
        </div>
        {footer.enabled && (
          <div className="flex items-center gap-4 mt-3">
            <label className="label">Hauteur</label>
            <NumberInput
              value={footer.height ?? 8}
              onChange={(v) => setFooter({ height: v })}
              min={4} max={30} step={0.5} unit="mm"
            />
          </div>
        )}
        {footer.enabled && (
          <div className="flex items-center gap-4 mt-2">
            <label className="label">Espace avant (après vignettes)</label>
            <NumberInput
              value={footer.spacingBefore ?? 0}
              onChange={(v) => setFooter({ spacingBefore: v })}
              min={0} max={30} step={0.5} unit="mm"
            />
          </div>
        )}
      </Section>

      {footer.enabled && (
        <>
          {/* Page number */}
          <Section title="Numérotation des pages" collapsible defaultOpen>
            <Toggle
              value={footer.pageNumber?.enabled ?? true}
              onChange={(v) => setFooter({ pageNumber: { ...footer.pageNumber, enabled: v } })}
              label="Afficher le numéro de page"
            />
            {(footer.pageNumber?.enabled ?? true) && (
              <div className="mt-3 flex flex-col gap-3">
                <div>
                  <label className="label mb-1.5 block">Format</label>
                  <input
                    className="input font-mono text-xs"
                    value={footer.pageNumber?.format ?? 'Page {n} / {total}'}
                    onChange={(e) => setFooter({ pageNumber: { ...footer.pageNumber, format: e.target.value } })}
                    placeholder="Page {n} / {total}"
                  />
                  <p className="mt-1 text-[11px] text-gray-600">Variables : <code className="text-gray-500">{'{n}'}</code> = n° page, <code className="text-gray-500">{'{total}'}</code> = total</p>
                </div>
                <div>
                  <label className="label mb-1.5 block">Police</label>
                  <div className="flex gap-1.5">
                    <select
                      className="input text-xs flex-1"
                      value={footer.pageNumber?.fontFamily ?? 'inherit'}
                      onChange={(e) => { if (e.target.value !== '__sep__') setFooter({ pageNumber: { ...footer.pageNumber, fontFamily: e.target.value } }) }}
                    >
                      {allFontOptions.map(f => (
                        <option key={f.value} value={f.value} disabled={f.disabled}>{f.label}</option>
                      ))}
                    </select>
                    <button
                      className="px-2 py-1.5 bg-surface-3 border border-surface-5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
                      title="Charger une police"
                      onClick={() => fontInputRef.current?.click()}
                    >
                      <Upload size={12} />
                    </button>
                    <input ref={fontInputRef} type="file" className="hidden" accept=".ttf,.woff,.woff2,.otf" onChange={handleFontUpload} />
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <label className="label mb-1.5 block">Position</label>
                    <AlignButtons
                      value={footer.pageNumber?.position ?? 'center'}
                      onChange={(v) => setFooter({ pageNumber: { ...footer.pageNumber, position: v } })}
                    />
                  </div>
                  <div>
                    <label className="label mb-1.5 block">Taille</label>
                    <NumberInput
                      value={footer.pageNumber?.fontSize ?? 8}
                      onChange={(v) => setFooter({ pageNumber: { ...footer.pageNumber, fontSize: v } })}
                      min={5} max={24} step={0.5} unit="pt"
                    />
                  </div>
                  <div>
                    <label className="label mb-1.5 block">Couleur</label>
                    <ColorPickerInline
                      value={footer.pageNumber?.color ?? '#6b7280'}
                      onChange={(v) => setFooter({ pageNumber: { ...footer.pageNumber, color: v } })}
                    />
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Conditional notes */}
          <Section title="Notes conditionnelles" collapsible>
            <p className="text-xs text-gray-600 mb-3">
              Afficher une note dans le pied de page quand une condition est vérifiée sur une colonne.
            </p>

            <div className="flex flex-col gap-2">
              {(footer.conditionalNotes ?? []).map(note => (
                <ConditionalNoteRow
                  key={note.id}
                  note={note}
                  columns={columns}
                  onChange={(patch) => updateNote(note.id, patch)}
                  onRemove={() => removeNote(note.id)}
                />
              ))}
            </div>

            <button
              className="mt-3 flex items-center gap-2 text-xs text-accent hover:text-accent/80 transition-colors"
              onClick={addNote}
            >
              <Plus size={12} /> Ajouter une note
            </button>
          </Section>

          {/* Background */}
          <Section title="Fond" collapsible>
            <div className="flex items-center gap-3">
              <label className="label">Couleur de fond</label>
              <ColorPickerInline
                value={footer.bgColor === 'transparent' ? '#ffffff' : (footer.bgColor ?? '#ffffff')}
                onChange={(v) => setFooter({ bgColor: v })}
                allowTransparent
                isTransparent={footer.bgColor === 'transparent'}
                onTransparent={() => setFooter({ bgColor: 'transparent' })}
              />
            </div>
          </Section>

          <Section title="Marges du pied de page" collapsible>
            <p className="text-xs text-gray-600 mb-3">
              Marges personnalisées pour le pied de page, indépendantes des marges de grille.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <label className="label mb-1.5 block">Marge gauche</label>
                <NumberInput
                  value={footer.paddingLeft ?? ''}
                  onChange={(v) => setFooter({ paddingLeft: v })}
                  min={0} max={50} step={0.5} unit="mm"
                />
                {footer.paddingLeft != null && (
                  <button className="mt-1 text-[10px] text-gray-600 hover:text-accent" onClick={() => setFooter({ paddingLeft: null })}>
                    Réinitialiser
                  </button>
                )}
              </div>
              <div>
                <label className="label mb-1.5 block">Marge droite</label>
                <NumberInput
                  value={footer.paddingRight ?? ''}
                  onChange={(v) => setFooter({ paddingRight: v })}
                  min={0} max={50} step={0.5} unit="mm"
                />
                {footer.paddingRight != null && (
                  <button className="mt-1 text-[10px] text-gray-600 hover:text-accent" onClick={() => setFooter({ paddingRight: null })}>
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
          </Section>
        </>
      )}
    </div>
  )
}

// ─── Conditional note row ─────────────────────────────────────────────────────

function ConditionalNoteRow({ note, columns, onChange, onRemove }) {
  return (
    <div className="flex flex-col gap-1.5 p-3 bg-surface-3 rounded-lg border border-surface-5">
      {/* Condition row */}
      <div className="flex items-center gap-2">
        <Hash size={11} className="text-gray-600 shrink-0" />
        <select
          className="input text-xs flex-1"
          value={note.column ?? ''}
          onChange={(e) => onChange({ column: e.target.value || null })}
        >
          <option value="">Colonne…</option>
          {columns.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="input text-xs w-16"
          value={note.operator ?? '=='}
          onChange={(e) => onChange({ operator: e.target.value })}
        >
          <option value="==">est</option>
          <option value="!=">n'est pas</option>
          <option value="contains">contient</option>
          <option value="!empty">non vide</option>
        </select>
        {note.operator !== '!empty' && (
          <input
            className="input text-xs w-24"
            value={note.value ?? ''}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="valeur"
          />
        )}
        <button className="btn-icon p-1" onClick={onRemove}>
          <Trash2 size={11} className="text-red-400" />
        </button>
      </div>
      {/* Note text */}
      <input
        className="input text-xs"
        value={note.text ?? ''}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Texte de la note à afficher…"
      />
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Section({ title, children, collapsible = false, defaultOpen = false }) {
  const [open, setOpen] = useState(!collapsible || defaultOpen)
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex items-center justify-between ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
      >
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
        {collapsible && (open ? <ChevronUp size={12} className="text-gray-600" /> : <ChevronDown size={12} className="text-gray-600" />)}
      </div>
      <div className="border-t border-surface-4 pt-3">
        {(!collapsible || open) && children}
      </div>
    </div>
  )
}

function AlignButtons({ value, onChange }) {
  const opts = [
    { v: 'left',   Icon: AlignLeft },
    { v: 'center', Icon: AlignCenter },
    { v: 'right',  Icon: AlignRight },
  ]
  return (
    <div className="flex rounded-lg overflow-hidden border border-surface-5">
      {opts.map(({ v, Icon }) => (
        <button
          key={v}
          className={`p-2 transition-colors ${value === v ? 'bg-accent text-white' : 'bg-surface-3 text-gray-400 hover:text-gray-200'}`}
          onClick={() => onChange(v)}
        >
          <Icon size={12} />
        </button>
      ))}
    </div>
  )
}

function LogoUpload({ src, onChange }) {
  const inputRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onChange(ev.target.result)
    reader.readAsDataURL(file)
  }

  if (src) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-24 h-12 bg-surface-3 border border-surface-5 rounded-lg flex items-center justify-center overflow-hidden">
          <img src={src} alt="Logo" className="max-w-full max-h-full object-contain" />
        </div>
        <button className="btn-ghost text-xs gap-1" onClick={() => onChange(null)}>
          <X size={12} /> Supprimer
        </button>
      </div>
    )
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-surface-5 hover:border-accent/50 rounded-lg text-xs text-gray-500 hover:text-gray-300 transition-colors"
        onClick={() => inputRef.current.click()}
      >
        <ImageIcon size={14} />
        Charger un logo (PNG, SVG, JPG…)
      </button>
    </>
  )
}
