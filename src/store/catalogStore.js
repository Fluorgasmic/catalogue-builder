import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
      imageBasePath: 'http://localhost:3001/',
      imageColumn: null,             // column used to build image filename
      imageExtension: '.jpg',

      setData: ({ rows, columns, fileName }) => set({
        rawData: rows,
        columns,
        fileName,
        groupColumn: null,
        imageColumn: columns[0] ?? null,
      }),

      setGroupColumn: (col) => set({ groupColumn: col }),
      setImageBasePath: (path) => set({ imageBasePath: path }),
      setImageColumn: (col) => set({ imageColumn: col }),
      setImageExtension: (ext) => set({ imageExtension: ext }),

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
          version: 1,
          projectName: s.projectName,
          grid: s.grid,
          vignetteBlocks: s.vignetteBlocks,
          headerBlocks: s.headerBlocks,
          footerBlocks: s.footerBlocks,
          header: s.header,
          footer: s.footer,
          groupColumn: s.groupColumn,
          imageBasePath: s.imageBasePath,
          imageColumn: s.imageColumn,
          imageExtension: s.imageExtension,
          savedColors: s.savedColors,
        }, null, 2)
      },

      importProject: (json) => {
        try {
          const data = JSON.parse(json)
          set({
            projectName: data.projectName ?? 'Importé',
            grid: data.grid ?? DEFAULT_GRID,
            vignetteBlocks: data.vignetteBlocks ?? [],
            headerBlocks: data.headerBlocks ?? [],
            footerBlocks: data.footerBlocks ?? [],
            header: data.header ?? DEFAULT_HEADER,
            footer: data.footer ?? DEFAULT_FOOTER,
            groupColumn: data.groupColumn ?? null,
            imageBasePath: data.imageBasePath ?? 'http://localhost:3001/',
            imageColumn: data.imageColumn ?? null,
            imageExtension: data.imageExtension ?? '.jpg',
            savedColors: data.savedColors ?? [],
          })
          return true
        } catch {
          return false
        }
      },
    }),
    {
      name: 'catalogue-builder-v1',
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
        imageBasePath: s.imageBasePath,
        imageExtension: s.imageExtension,
        groupColumn: s.groupColumn,
      }),
    }
  )
)

export default useCatalogStore
