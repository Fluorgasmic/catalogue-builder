/**
 * Local image folder support via the File System Access API.
 *
 * Flow:
 *  1. User clicks "Choisir un dossier" → pickImageFolder()
 *  2. We scan all image files and create blob: URLs (lazy, on demand)
 *  3. buildImageUrl() resolves filenames via getLocalImageUrl()
 *
 * No server needed — works entirely in the browser (Chrome/Edge).
 */

const IMAGE_EXTS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif', 'bmp', 'ico',
])

let directoryHandle = null
let folderName = null

// filename (lowercase) → blob: URL
const urlCache = new Map()
// filename (lowercase) → FileSystemFileHandle  (for lazy resolution)
const handleCache = new Map()
// Track scan completion
let scanned = false

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Open a native folder picker and scan the selected directory.
 * Returns { name, count } on success.
 */
export async function pickImageFolder() {
  const handle = await window.showDirectoryPicker({ mode: 'read' })
  // Clear previous state
  revokeAll()
  directoryHandle = handle
  folderName = handle.name
  scanned = false

  // Scan directory entries (just collect file handles, no blob creation yet)
  let count = 0
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind !== 'file') continue
    const ext = name.split('.').pop()?.toLowerCase()
    if (!ext || !IMAGE_EXTS.has(ext)) continue
    handleCache.set(name.toLowerCase(), entry)
    count++
  }
  scanned = true
  return { name: folderName, count }
}

/**
 * Get a blob: URL for an image filename.
 * Lazy: only creates the blob URL on first access, then caches it.
 * Returns null if the file doesn't exist in the scanned folder.
 */
export async function getLocalImageUrl(filename) {
  if (!filename || !directoryHandle) return null

  const key = filename.trim().toLowerCase()

  // Already resolved
  if (urlCache.has(key)) return urlCache.get(key)

  // Look up file handle
  const fileHandle = handleCache.get(key)
  if (!fileHandle) {
    urlCache.set(key, null) // cache the miss
    return null
  }

  try {
    const file = await fileHandle.getFile()
    const url = URL.createObjectURL(file)
    urlCache.set(key, url)
    return url
  } catch {
    urlCache.set(key, null)
    return null
  }
}

/**
 * Synchronous lookup — returns cached blob URL or null.
 * Use this in render paths where async isn't practical.
 */
export function getLocalImageUrlSync(filename) {
  if (!filename || !directoryHandle) return null
  const key = filename.trim().toLowerCase()
  return urlCache.get(key) ?? null
}

/**
 * Pre-resolve a batch of filenames (e.g. all visible images).
 * Call this after folder pick to warm the cache for the first page.
 */
export async function preloadImages(filenames) {
  const promises = filenames
    .filter(f => f && !urlCache.has(f.trim().toLowerCase()))
    .slice(0, 200) // cap to avoid overwhelming
    .map(f => getLocalImageUrl(f))
  await Promise.all(promises)
}

export function hasLocalImages() {
  return directoryHandle !== null && scanned
}

export function getLocalFolderName() {
  return folderName
}

export function getLocalImageCount() {
  return handleCache.size
}

export function clearLocalImages() {
  revokeAll()
  directoryHandle = null
  folderName = null
  scanned = false
}

export function isSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

// ─── Internal ────────────────────────────────────────────────────────────────

function revokeAll() {
  for (const url of urlCache.values()) {
    if (url) URL.revokeObjectURL(url)
  }
  urlCache.clear()
  handleCache.clear()
}
