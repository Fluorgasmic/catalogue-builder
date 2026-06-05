import { getLocalImageUrlSync, getLocalImageUrl, hasLocalImages } from './localImages'

/**
 * Build a proper image URL from a column value + base path + extension.
 *
 * Supports three modes:
 *  1. __local__  — resolve from the browser's File System Access API (no server)
 *  2. http(s):// — use the URL directly
 *  3. Other      — combine basePath + filename + extension (via image server)
 */
export function buildImageUrl(colValue, basePath, extension) {
  if (!colValue) return null

  const val = String(colValue).trim()

  // If the column value is already a full HTTP URL, use it directly
  if (val.startsWith('http://') || val.startsWith('https://')) return val

  // Extract just the filename (strip any leading path — works for Unix and Windows)
  const filename = val.replace(/^.*[\\/]/, '')
  const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(filename)
  const fullFilename = filename + (hasExt ? '' : extension)

  // ── Local mode: resolve from the scanned folder ──
  if (basePath === '__local__') {
    // Try synchronous cache first (renders instantly if already loaded)
    const cached = getLocalImageUrlSync(fullFilename)
    if (cached) return cached
    // If not cached yet, trigger async load and return a placeholder.
    // The component's onError/useEffect will retry once loaded.
    if (hasLocalImages()) {
      getLocalImageUrl(fullFilename) // fire-and-forget: populates cache
    }
    return null // will show missing-image placeholder until cache is warm
  }

  // ── Server / HTTP mode ──
  const base = basePath.endsWith('/') ? basePath : basePath + '/'
  return base + fullFilename
}
