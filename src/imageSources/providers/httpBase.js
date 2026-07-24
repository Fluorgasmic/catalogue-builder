/**
 * Provider "URL / Serveur d'images" — générique base URL.
 *
 * Couvre tous les cas où les images sont accessibles via une URL publique
 * ou signée : NAS Synology, OVH Object Storage, bucket S3 public, serveur web,
 * ancien serveur local `localhost:3001`, etc.
 *
 * Aucune image copiée : on construit simplement baseUrl + filename.
 * La config (baseUrl) est sérialisable en clair dans Firestore.
 */

function normExt(extension) {
  if (!extension) return ''
  return extension.startsWith('.') ? extension : '.' + extension
}

function fullName(filename, extension) {
  const name = String(filename).trim().replace(/^.*[\\/]/, '')
  const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(name)
  return name + (hasExt ? '' : normExt(extension))
}

const httpBaseProvider = {
  id: 'http',
  label: 'URL / Serveur',
  icon: 'Link',
  help: "Collez l'URL publique de votre dossier d'images (NAS Synology, OVH, S3, serveur web…).",
  needsAuth: false,
  persistable: true,

  isSupported() {
    return true
  },

  async connect(config = {}) {
    const baseUrl = String(config.baseUrl ?? '').trim()
    return { kind: 'http', baseUrl }
  },

  async restore(serialized = {}) {
    return {
      connection: { kind: 'http', baseUrl: String(serialized.baseUrl ?? '').trim() },
      needsUserAction: false,
    }
  },

  _buildUrl(conn, filename, extension) {
    if (!conn?.baseUrl || !filename) return null
    const val = String(filename).trim()
    // URL absolue directement dans la cellule → utilisée telle quelle
    if (val.startsWith('http://') || val.startsWith('https://')) return val
    const base = conn.baseUrl.endsWith('/') ? conn.baseUrl : conn.baseUrl + '/'
    return base + fullName(val, extension)
  },

  async resolveUrl(conn, filename, extension) {
    return this._buildUrl(conn, filename, extension)
  },

  resolveUrlSync(conn, filename, extension) {
    return this._buildUrl(conn, filename, extension)
  },

  serialize(conn) {
    return { baseUrl: conn?.baseUrl ?? '' }
  },

  count() {
    return 0 // inconnu pour une base URL distante
  },

  disconnect() {},
}

export default httpBaseProvider
