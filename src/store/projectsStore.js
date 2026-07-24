import { create } from 'zustand'
import {
  listProjects, createProject, loadProject, saveProject,
  duplicateProject, deleteProject,
} from '../lib/firestore'

/**
 * État du tableau de bord multi-projets (Firestore).
 *
 * - uid          : utilisateur connecté (renseigné par AuthGate)
 * - projects     : liste des projets (métadonnées)
 * - currentId    : projet actuellement ouvert dans l'éditeur (null = dashboard)
 * - view         : 'dashboard' | 'editor'
 *
 * L'hydratation du contenu d'un projet dans le catalogStore se fait dans
 * openProject() via le callback fourni (évite un couplage circulaire).
 */
const useProjectsStore = create((set, get) => ({
  uid: null,
  projects: [],
  currentId: null,
  view: 'dashboard',
  loading: false,
  error: null,

  setUid: (uid) => set({ uid }),

  reset: () => set({ projects: [], currentId: null, view: 'dashboard', error: null }),

  refresh: async () => {
    const { uid } = get()
    if (!uid) return
    set({ loading: true, error: null })
    try {
      const projects = await listProjects(uid)
      set({ projects, loading: false })
    } catch (e) {
      set({ error: e.message ?? 'Chargement impossible', loading: false })
    }
  },

  /** Crée un projet vierge et l'ouvre. `initialData` = exportProject() d'un état neuf. */
  newProject: async (name, initialData, hydrate) => {
    const { uid, refresh } = get()
    if (!uid) return null
    const id = await createProject(uid, { name, data: initialData, productCount: 0 })
    await refresh()
    if (hydrate) hydrate(initialData)
    set({ currentId: id, view: 'editor' })
    return id
  },

  /** Ouvre un projet : charge son contenu et l'injecte via `hydrate(json)`. */
  openProject: async (projectId, hydrate) => {
    const { uid } = get()
    if (!uid) return
    set({ loading: true, error: null })
    try {
      const project = await loadProject(uid, projectId)
      if (project?.data && hydrate) hydrate(project.data)
      set({ currentId: projectId, view: 'editor', loading: false })
    } catch (e) {
      set({ error: e.message ?? 'Ouverture impossible', loading: false })
    }
  },

  /** Sauvegarde le projet courant (appelé par l'auto-save debouncé). */
  save: async ({ name, data, productCount } = {}) => {
    const { uid, currentId } = get()
    if (!uid || !currentId) return
    await saveProject(uid, currentId, { name, data, productCount })
  },

  duplicate: async (projectId) => {
    const { uid, refresh } = get()
    if (!uid) return
    await duplicateProject(uid, projectId)
    await refresh()
  },

  remove: async (projectId) => {
    const { uid, refresh, currentId } = get()
    if (!uid) return
    await deleteProject(uid, projectId)
    if (currentId === projectId) set({ currentId: null, view: 'dashboard' })
    await refresh()
  },

  rename: async (projectId, name) => {
    const { uid, refresh } = get()
    if (!uid) return
    await saveProject(uid, projectId, { name })
    await refresh()
  },

  backToDashboard: () => set({ view: 'dashboard' }),
}))

export default useProjectsStore
