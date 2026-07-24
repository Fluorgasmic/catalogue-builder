import { get as getProvider } from '../imageSources/registry'
import { getActiveConnection } from '../imageSources/activeConnection'

/**
 * Construit une URL d'image affichable à partir de la valeur d'une colonne.
 *
 * Rétrocompatible : `basePath` (2e argument) peut être :
 *   - '__local__'      → provider local, résolu via la connexion active
 *   - '__<providerId>__' → tout autre provider (gdrive, onedrive…), connexion active
 *   - une URL http(s)  → provider http (base URL)
 *   - '' / null        → aucune source configurée
 *
 * Si la valeur de colonne est déjà une URL absolue, elle est renvoyée telle quelle.
 */
export function buildImageUrl(colValue, basePath, extension) {
  if (!colValue) return null
  const val = String(colValue).trim()
  if (!val) return null

  // URL absolue directement dans la cellule → utilisée telle quelle
  if (val.startsWith('http://') || val.startsWith('https://')) return val

  const providerId = resolveProviderId(basePath)

  // Provider avec connexion active (local, gdrive, onedrive…)
  if (providerId && providerId !== 'http') {
    const provider = getProvider(providerId)
    const conn = getActiveConnection()
    if (!provider || !conn) return null
    if (provider.resolveUrlSync) return provider.resolveUrlSync(conn, val, extension)
    // Pas de variante sync : déclenche l'async et renvoie null en attendant.
    provider.resolveUrl?.(conn, val, extension)
    return null
  }

  // Provider http : basePath EST la base URL.
  if (typeof basePath === 'string' && basePath && basePath !== '') {
    const filename = val.replace(/^.*[\\/]/, '')
    const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(filename)
    const ext = extension && !extension.startsWith('.') ? '.' + extension : (extension ?? '')
    const fullFilename = filename + (hasExt ? '' : ext)
    const base = basePath.endsWith('/') ? basePath : basePath + '/'
    return base + fullFilename
  }

  return null
}

/** Extrait un providerId d'un basePath de la forme '__id__', sinon null. */
function resolveProviderId(basePath) {
  if (typeof basePath !== 'string') return null
  const m = basePath.match(/^__([a-z0-9]+)__$/i)
  return m ? m[1] : null
}
