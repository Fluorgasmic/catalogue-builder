/**
 * Registre des providers de source d'images.
 *
 * Chaque provider s'enregistre au démarrage (voir src/imageSources/index.js).
 * Le reste de l'app ne connaît que ce registre — jamais les providers en dur.
 */

const providers = new Map()

/** Enregistre un provider. @param {import('./ImageSourceProvider').ImageSourceProvider} provider */
export function register(provider) {
  if (!provider?.id) throw new Error('ImageSource provider requires an id')
  providers.set(provider.id, provider)
}

/** Récupère un provider par id, ou null. */
export function get(id) {
  return providers.get(id) ?? null
}

/** Tous les providers enregistrés. */
export function list() {
  return [...providers.values()]
}

/** Providers supportés dans le navigateur courant. */
export function listSupported() {
  return list().filter((p) => {
    try { return p.isSupported() } catch { return false }
  })
}
