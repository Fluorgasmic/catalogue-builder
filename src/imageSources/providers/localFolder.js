/**
 * Provider "Dossier local" — File System Access API + persistance IndexedDB.
 *
 * Amélioration clé vs. l'ancien localImages.js : le FileSystemDirectoryHandle
 * est persisté dans IndexedDB (structured-clone, impossible en localStorage).
 * Au rechargement, on peut reconnecter le dossier en 1 clic (re-grant de
 * permission) au lieu de re-naviguer dans l'arborescence.
 *
 * Chrome / Edge uniquement (showDirectoryPicker). Masqué ailleurs.
 */

import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'

const IMAGE_EXTS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif', 'bmp', 'ico',
])

// Une clé par emplacement : produits et assets pointent sur deux dossiers
// distincts, et connecter l'un ne doit pas déconnecter l'autre.
const LEGACY_IDB_KEY = 'cb-local-dir-handle'

function idbKey(slot = 'products') {
  return `cb-dir-handle-${slot}`
}

/** Lit le handle du dossier, en retombant sur l'ancienne clé unique pour les produits. */
async function readHandle(slot) {
  try {
    const handle = await idbGet(idbKey(slot))
    if (handle) return handle
    // Projets antérieurs aux emplacements : le dossier produits était seul.
    if (slot === 'products') return await idbGet(LEGACY_IDB_KEY)
    return null
  } catch {
    return null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normExt(extension) {
  if (!extension) return ''
  return extension.startsWith('.') ? extension : '.' + extension
}

function fullName(filename, extension) {
  const name = String(filename).trim().replace(/^.*[\\/]/, '') // strip path (unix+win)
  const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(name)
  return name + (hasExt ? '' : normExt(extension))
}

/** Crée une connexion vivante à partir d'un handle déjà autorisé. */
async function buildConnection(handle) {
  const handleCache = new Map() // filename lc → FileSystemFileHandle
  const urlCache = new Map()    // filename lc → blob URL | null

  let count = 0
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind !== 'file') continue
    const ext = name.split('.').pop()?.toLowerCase()
    if (!ext || !IMAGE_EXTS.has(ext)) continue
    handleCache.set(name.toLowerCase(), entry)
    count++
  }

  return { kind: 'local', handle, folderName: handle.name, handleCache, urlCache, _count: count }
}

async function permissionState(handle) {
  if (!handle?.queryPermission) return 'granted'
  return handle.queryPermission({ mode: 'read' })
}

// ─── Provider ────────────────────────────────────────────────────────────────

const localFolderProvider = {
  id: 'local',
  label: 'Dossier local',
  icon: 'FolderOpen',
  help: "Vos images restent sur votre machine. Chrome ou Edge requis.",
  needsAuth: false,
  persistable: true,

  isSupported() {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window
  },

  async connect(config = {}, slot = 'products') {
    const handle = await window.showDirectoryPicker({ mode: 'read' })
    await idbSet(idbKey(slot), handle) // persiste pour reconnexion 1 clic
    return buildConnection(handle)
  },

  /**
   * Restauration après rechargement : lit le handle en IndexedDB.
   * - permission 'granted'  → reconnexion transparente
   * - permission 'prompt'   → needsUserAction=true (bouton "Reconnecter")
   */
  async restore(serialized = {}, slot = 'products') {
    const handle = await readHandle(slot)
    if (!handle) return { connection: null, needsUserAction: false }

    const state = await permissionState(handle)
    if (state === 'granted') {
      return { connection: await buildConnection(handle), needsUserAction: false }
    }
    // Permission perdue : garder le handle pour le regrant, mais exiger un clic.
    return { connection: { kind: 'local', handle, folderName: handle.name, pending: true }, needsUserAction: true }
  },

  /** Re-demande la permission après un rechargement (doit être appelé dans un geste utilisateur). */
  async requestPermission(conn) {
    if (!conn?.handle?.requestPermission) return null
    const res = await conn.handle.requestPermission({ mode: 'read' })
    if (res !== 'granted') return null
    return buildConnection(conn.handle)
  },

  async resolveUrl(conn, filename, extension) {
    if (!conn?.handleCache || !filename) return null
    const key = fullName(filename, extension).toLowerCase()
    if (conn.urlCache.has(key)) return conn.urlCache.get(key)

    const fileHandle = conn.handleCache.get(key)
    if (!fileHandle) { conn.urlCache.set(key, null); return null }
    try {
      const file = await fileHandle.getFile()
      const url = URL.createObjectURL(file)
      conn.urlCache.set(key, url)
      return url
    } catch {
      conn.urlCache.set(key, null)
      return null
    }
  },

  resolveUrlSync(conn, filename, extension) {
    if (!conn?.urlCache || !filename) return null
    const key = fullName(filename, extension).toLowerCase()
    if (conn.urlCache.has(key)) return conn.urlCache.get(key)
    // cache froid : déclenche le chargement async (fire-and-forget)
    if (conn.handleCache?.has(key)) this.resolveUrl(conn, filename, extension)
    return null
  },

  serialize(conn) {
    return { folderName: conn?.folderName ?? null, imageCount: conn?._count ?? 0 }
  },

  count(conn) {
    return conn?._count ?? conn?.handleCache?.size ?? 0
  },

  /** Le dossier sait énumérer son contenu : permet de choisir un asset par sa vignette. */
  canList: true,

  list(conn) {
    if (!conn?.handleCache) return []
    // handleCache est indexé en minuscules ; on ressort le nom réel du fichier.
    return [...conn.handleCache.values()]
      .map((h) => h.name)
      .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
  },

  disconnect(conn, slot = 'products') {
    if (conn?.urlCache) {
      for (const url of conn.urlCache.values()) if (url) URL.revokeObjectURL(url)
      conn.urlCache.clear()
    }
    idbDel(idbKey(slot)).catch(() => {})
    if (slot === 'products') idbDel(LEGACY_IDB_KEY).catch(() => {})
  },
}

export default localFolderProvider
