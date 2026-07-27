import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { migrateProject, PROJECT_VERSION } from '../blocks/migrations'

// ─── Default values ────────────────────────────────────────────────────────────

const DEFAULT_GRID = {
  columns: 2,
  rows: 3,
  pageFormat: 'A4',
  orientation: 'portrait',
  margins: { top: 15, bottom: 15, left: 12, right: 12 },
  gutterH: 4,   // horizontal gutter between columns (mm)
  gutterV: 4,   // vertical gutter between rows (mm)
}

const DEFAULT_HEADER = {
  enabled: true,
  height: 18,           // mm
  title: { enabled: true, column: null, staticText: '', fontSize: 14, fontWeight: 'bold', color: '#ffffff', align: 'left' },
  rule: { enabled: true, color: '#7C5CFC', thickness: 1 },
  logo: { enabled: false, src: null, position: 'right', width: 24, height: 10 },
  secondaryText: { enabled: false, text: '', fontSize: 9, color: '#9ca3af' },
  bgColor: 'transparent',
  spacingAfter: 0,        // mm gap between header bottom and vignette grid
  paddingLeft: null,      // null = use grid margin; number = override (mm)
  paddingRight: null,
}

const DEFAULT_FOOTER = {
  enabled: true,
  height: 8,            // mm
  pageNumber: { enabled: true, position: 'center', format: 'Page {n} / {total}', fontSize: 8, color: '#6b7280' },
  conditionalNotes: [],
  bgColor: 'transparent',
  spacingBefore: 0,       // mm gap between vignette grid and footer top
  paddingLeft: null,
  paddingRight: null,
}

const DEFAULT_VIGNETTE_BLOCKS = []

// Dérive une valeur "basePath" (compat rendu) depuis la source d'images.
//  - provider 'local'  → '__local__'  (résolu via la connexion active)
//  - provider 'http'   → la baseUrl
//  - autres providers  → '__' + providerId + '__'  (résolu via connexion active)
function deriveBasePath(imageSource) {
  if (!imageSource?.providerId) return ''
  if (imageSource.providerId === 'http') return imageSource.config?.baseUrl ?? ''
  return `__${imageSource.providerId}__`
}

// Migration douce : ancien imageBasePath (string) → nouvel imageSource (objet).
function migrateImageSource(imageBasePath) {
  if (imageBasePath === '__local__') return { providerId: 'local', config: {} }
  if (typeof imageBasePath === 'string' && imageBasePath && imageBasePath !== 'http://localhost:3001/') {
    return { providerId: 'http', config: { baseUrl: imageBasePath } }
  }
  return { providerId: 'http', config: { baseUrl: '' } }
}

// ─── Store ────────────────────────────────────────────────────────────────────

const useCatalogStore = create(
  persist(
    (set, get) => ({
      // ── App state ──────────────────────────────────────────────
      activeTab: 'import',          // 'import' | 'vignette' | 'grid' | 'header' | 'footer' | 'preview'
      setActiveTab: (tab) => set({ activeTab: tab }),

      // ── Data ──────────────────────────────────────────────────
      rawData: [],                   // array of row objects (all rows)
      columns: [],                   // column names detected
      fileName: null,
      groupColumn: null,             // column used for grouping (section breaks)
      imageColumn: null,             // column used to build image filename
      imageExtension: '.jpg',

      // ── Source d'images (architecture de providers) ───────────
      // providerId: 'local' | 'http' | 'gdrive' | 'onedrive' | …
      // config: sérialisée, persistée (baseUrl, folderName, mapping…) SANS token.
      imageSource: { providerId: 'http', config: { baseUrl: '' } },
      setImageSource: (partial) => set((s) => ({ imageSource: { ...s.imageSource, ...partial } })),
      setImageSourceConfig: (config) => set((s) => ({ imageSource: { ...s.imageSource, config: { ...s.imageSource.config, ...config } } })),

      // ── Répertoire d'assets de mise en page ───────────────────
      // Logos, icônes, badges, fonds : tout visuel qui ne vient pas du fichier
      // Excel. Source séparée des photos produits, car ni le même contenu ni
      // le même emplacement. Les blocs n'en stockent que le NOM de fichier,
      // ce qui garde le projet léger et enregistrable.
      assetSource: { providerId: 'local', config: {} },
      setAssetSource: (partial) => set((s) => ({ assetSource: { ...s.assetSource, ...partial } })),
      setAssetSourceConfig: (config) => set((s) => ({ assetSource: { ...s.assetSource, config: { ...s.assetSource.config, ...config } } })),

      // ── Dispositions de vignette ──────────────────────────────
      // Une grande vignette pleine largeur et une petite de bas de page n'ont
      // pas les mêmes proportions : chacune mérite son agencement de blocs.
      // `vignetteBlocks` reste la disposition du projet ; celles-ci s'y
      // ajoutent et sont désignées bande par bande dans un gabarit.
      vignetteLayouts: [],

      saveVignetteLayout: (nom) => set((s) => {
        const id = `disp-${Date.now().toString(36)}`
        return {
          vignetteLayouts: [
            ...s.vignetteLayouts,
            { id, name: nom || `Disposition ${s.vignetteLayouts.length + 1}`, blocks: s.vignetteBlocks },
          ],
        }
      }),
      updateVignetteLayout: (id, blocks) => set((s) => ({
        vignetteLayouts: s.vignetteLayouts.map((l) => l.id === id ? { ...l, blocks } : l),
      })),
      removeVignetteLayout: (id) => set((s) => ({
        vignetteLayouts: s.vignetteLayouts.filter((l) => l.id !== id),
      })),

      // ── Gabarits de page ──────────────────────────────────────
      // Quel découpage de page pour quelle catégorie. `null` signifie « la
      // grille du projet », ce qui laisse les catalogues existants inchangés.
      pageTemplates: [],          // gabarits composés par l'utilisateur
      defaultTemplateId: null,
      templateByGroup: {},        // { 'Chocolats': 'trois-puis-six' }

      setDefaultTemplate: (id) => set({ defaultTemplateId: id || null }),
      setGroupTemplate: (groupe, id) => set((s) => {
        const suivant = { ...s.templateByGroup }
        if (id) suivant[groupe] = id
        else delete suivant[groupe]   // revient au gabarit par défaut
        return { templateByGroup: suivant }
      }),

      // ── Structure du document ─────────────────────────────────
      // Sauts de page forcés, désignés par la valeur d'une colonne clé plutôt
      // que par un numéro de page : la coupure suit donc son produit et
      // survit à l'ajout d'articles avant lui.
      pageBreaks: [],
      breakKeyColumn: null,

      setBreakKeyColumn: (col) => set({ breakKeyColumn: col }),
      togglePageBreak: (cle) => set((s) => ({
        pageBreaks: s.pageBreaks.includes(cle)
          ? s.pageBreaks.filter((k) => k !== cle)
          : [...s.pageBreaks, cle],
      })),
      clearPageBreaks: () => set({ pageBreaks: [] }),

      // ── Prépresse ─────────────────────────────────────────────
      // Réglages d'impression : débord des aplats hors du format fini, et
      // marques destinées au façonnier. Persistés avec le projet, car ils
      // dépendent de l'imprimeur retenu.
      prepress: { bleed: 3, cropMarks: true, registration: false },
      setPrepress: (partial) => set((s) => ({ prepress: { ...s.prepress, ...partial } })),

      // Dérivé pour compat des composants de rendu : renvoie une valeur "basePath"
      // interprétable par buildImageUrl ('__local__', une URL, ou '').
      imageBasePath: '',

      setData: ({ rows, columns, fileName }) => set({
        rawData: rows,
        columns,
        fileName,
        groupColumn: null,
        imageColumn: columns[0] ?? null,
      }),

      setGroupColumn: (col) => set({ groupColumn: col }),
      setImageColumn: (col) => set({ imageColumn: col }),
      setImageExtension: (ext) => set({ imageExtension: ext }),

      // Recalcule imageBasePath depuis imageSource (appelé quand la source change).
      syncImageBasePath: () => set((s) => ({ imageBasePath: deriveBasePath(s.imageSource) })),

      clearData: () => set({ rawData: [], columns: [], fileName: null }),

      // ── Grid ──────────────────────────────────────────────────
      grid: DEFAULT_GRID,
      setGrid: (partial) => set((s) => ({ grid: { ...s.grid, ...partial } })),
      setMargins: (margins) => set((s) => ({ grid: { ...s.grid, margins: { ...s.grid.margins, ...margins } } })),

      // ── Vignette blocks ───────────────────────────────────────
      vignetteBlocks: DEFAULT_VIGNETTE_BLOCKS,
      selectedBlockId: null,

      addBlock: (block) => set((s) => ({ vignetteBlocks: [...s.vignetteBlocks, block] })),
      updateBlock: (id, patch) => set((s) => ({
        vignetteBlocks: s.vignetteBlocks.map((b) => b.id === id ? { ...b, ...patch } : b),
      })),
      removeBlock: (id) => set((s) => ({
        vignetteBlocks: s.vignetteBlocks.filter((b) => b.id !== id),
        selectedBlockId: s.selectedBlockId === id ? null : s.selectedBlockId,
      })),
      reorderBlocks: (blocks) => set({ vignetteBlocks: blocks }),
      setSelectedBlock: (id) => set({ selectedBlockId: id }),
      clearBlocks: () => set({ vignetteBlocks: [], selectedBlockId: null }),

      // ── Header / Footer ───────────────────────────────────────
      header: DEFAULT_HEADER,
      setHeader: (partial) => set((s) => ({ header: { ...s.header, ...partial } })),

      footer: DEFAULT_FOOTER,
      setFooter: (partial) => set((s) => ({ footer: { ...s.footer, ...partial } })),

      // ── Header / Footer blocks ────────────────────────────────
      headerBlocks: [],
      footerBlocks: [],
      selectedHFBlockId: null,

      addHFBlock: (section, block) => set((s) => {
        const key = section === 'header' ? 'headerBlocks' : 'footerBlocks'
        return { [key]: [...s[key], block], selectedHFBlockId: block.id }
      }),
      updateHFBlock: (section, id, patch) => set((s) => {
        const key = section === 'header' ? 'headerBlocks' : 'footerBlocks'
        return { [key]: s[key].map(b => b.id === id ? { ...b, ...patch } : b) }
      }),
      removeHFBlock: (section, id) => set((s) => {
        const key = section === 'header' ? 'headerBlocks' : 'footerBlocks'
        return {
          [key]: s[key].filter(b => b.id !== id),
          selectedHFBlockId: s.selectedHFBlockId === id ? null : s.selectedHFBlockId,
        }
      }),
      reorderHFBlocks: (section, blocks) => set({
        [section === 'header' ? 'headerBlocks' : 'footerBlocks']: blocks,
      }),
      setSelectedHFBlock: (id) => set({ selectedHFBlockId: id }),

      // ── Palette ───────────────────────────────────────────────
      savedColors: ['#7C5CFC', '#ffffff', '#000000', '#e5e7eb', '#f59e0b', '#10b981', '#ef4444'],
      addSavedColor: (color) => set((s) => ({
        savedColors: s.savedColors.includes(color) ? s.savedColors : [...s.savedColors, color],
      })),

      // ── Custom fonts ──────────────────────────────────────────
      customFonts: [],
      addCustomFont: (font) => set((s) => ({ customFonts: [...s.customFonts, font] })),
      removeCustomFont: (name) => set((s) => ({ customFonts: s.customFonts.filter(f => f.name !== name) })),

      // ── Preview state ─────────────────────────────────────────
      previewPage: 0,
      previewZoom: 75,
      setPreviewPage: (n) => set({ previewPage: n }),
      setPreviewZoom: (z) => set({ previewZoom: z }),

      // ── Project save/load ─────────────────────────────────────
      projectName: 'Sans titre',
      setProjectName: (name) => set({ projectName: name }),

      exportProject: () => {
        const s = get()
        return JSON.stringify({
          version: PROJECT_VERSION,
          projectName: s.projectName,
          grid: s.grid,
          vignetteBlocks: s.vignetteBlocks,
          headerBlocks: s.headerBlocks,
          footerBlocks: s.footerBlocks,
          header: s.header,
          footer: s.footer,
          groupColumn: s.groupColumn,
          imageSource: s.imageSource,
          assetSource: s.assetSource,
          prepress: s.prepress,
          vignetteLayouts: s.vignetteLayouts,
          pageTemplates: s.pageTemplates,
          defaultTemplateId: s.defaultTemplateId,
          templateByGroup: s.templateByGroup,
          pageBreaks: s.pageBreaks,
          breakKeyColumn: s.breakKeyColumn,
          imageColumn: s.imageColumn,
          imageExtension: s.imageExtension,
          savedColors: s.savedColors,
        }, null, 2)
      },

      importProject: (json) => {
        try {
          const brut = typeof json === 'string' ? JSON.parse(json) : json
          // Un projet antérieur stockait les coordonnées de vignette en pixels :
          // sans conversion, tous les blocs libres se décaleraient.
          const data = migrateProject(brut)
          const imageSource = data.imageSource ?? migrateImageSource(data.imageBasePath)
          set({
            projectName: data.projectName ?? 'Importé',
            grid: data.grid ?? DEFAULT_GRID,
            vignetteBlocks: data.vignetteBlocks ?? [],
            headerBlocks: data.headerBlocks ?? [],
            footerBlocks: data.footerBlocks ?? [],
            header: data.header ?? DEFAULT_HEADER,
            footer: data.footer ?? DEFAULT_FOOTER,
            groupColumn: data.groupColumn ?? null,
            imageSource,
            assetSource: data.assetSource ?? { providerId: 'local', config: {} },
            prepress: data.prepress ?? { bleed: 3, cropMarks: true, registration: false },
            vignetteLayouts: data.vignetteLayouts ?? [],
            pageTemplates: data.pageTemplates ?? [],
            defaultTemplateId: data.defaultTemplateId ?? null,
            templateByGroup: data.templateByGroup ?? {},
            pageBreaks: data.pageBreaks ?? [],
            breakKeyColumn: data.breakKeyColumn ?? null,
            imageBasePath: deriveBasePath(imageSource),
            imageColumn: data.imageColumn ?? null,
            imageExtension: data.imageExtension ?? '.jpg',
            savedColors: data.savedColors ?? [],
          })
          return true
        } catch {
          return false
        }
      },

      // Réinitialise l'état d'édition pour un nouveau projet vierge.
      // Conserve savedColors et customFonts (préférences transverses).
      resetProject: () => set({
        activeTab: 'import',
        rawData: [], columns: [], fileName: null, groupColumn: null,
        imageColumn: null, imageExtension: '.jpg',
        imageSource: { providerId: 'http', config: { baseUrl: '' } },
        assetSource: { providerId: 'local', config: {} },
        prepress: { bleed: 3, cropMarks: true, registration: false },
        vignetteLayouts: [],
        pageTemplates: [], defaultTemplateId: null, templateByGroup: {},
        pageBreaks: [], breakKeyColumn: null,
        imageBasePath: '',
        grid: DEFAULT_GRID,
        vignetteBlocks: [], selectedBlockId: null,
        headerBlocks: [], footerBlocks: [], selectedHFBlockId: null,
        header: DEFAULT_HEADER, footer: DEFAULT_FOOTER,
        previewPage: 0,
        projectName: 'Sans titre',
      }),
    }),
    {
      name: 'catalogue-builder-v1',
      version: PROJECT_VERSION,
      // Le contenu déjà présent dans le navigateur suit la même migration que
      // les projets importés — sinon les deux chemins divergeraient.
      migrate: (persisted, version) => migrateProject({ ...persisted, version }),
      partialize: (s) => ({
        grid: s.grid,
        vignetteBlocks: s.vignetteBlocks,
        headerBlocks: s.headerBlocks,
        footerBlocks: s.footerBlocks,
        header: s.header,
        footer: s.footer,
        savedColors: s.savedColors,
        customFonts: s.customFonts,
        projectName: s.projectName,
        imageSource: s.imageSource,
        assetSource: s.assetSource,
        prepress: s.prepress,
        vignetteLayouts: s.vignetteLayouts,
        pageTemplates: s.pageTemplates,
        defaultTemplateId: s.defaultTemplateId,
        templateByGroup: s.templateByGroup,
        pageBreaks: s.pageBreaks,
        breakKeyColumn: s.breakKeyColumn,
        imageExtension: s.imageExtension,
        groupColumn: s.groupColumn,
      }),
      // Migration au réhydratage + recalcul du basePath dérivé.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (!state.imageSource && state.imageBasePath !== undefined) {
          state.imageSource = migrateImageSource(state.imageBasePath)
        }
        state.imageBasePath = deriveBasePath(state.imageSource)
      },
    }
  )
)

export default useCatalogStore
