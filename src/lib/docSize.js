/**
 * Contrôle de taille avant écriture Firestore.
 *
 * Firestore refuse tout document au-delà de 1 Mio. Sans contrôle, l'écriture
 * part, échoue côté serveur, et l'utilisateur ne voit qu'une erreur technique
 * — voire rien du tout. On mesure donc avant d'écrire et on dit précisément
 * ce qui pèse.
 *
 * Cause quasi systématique : une image collée en base64 dans le document
 * (logo d'en-tête, badge, image de bloc) au lieu d'une référence.
 */

/** Limite dure de Firestore, en octets. */
export const FIRESTORE_MAX_BYTES = 1_048_576

/** Seuil d'alerte : on garde de la marge pour les métadonnées du document. */
export const SAFE_MAX_BYTES = 900_000

const UNITS = ['o', 'ko', 'Mo']

export function formatBytes(n) {
  let v = n
  let u = 0
  while (v >= 1024 && u < UNITS.length - 1) { v /= 1024; u++ }
  return `${v.toFixed(u === 0 ? 0 : 1)} ${UNITS[u]}`
}

/** Poids réel du document une fois sérialisé, en octets (UTF-8). */
export function measureDoc(data) {
  return new TextEncoder().encode(JSON.stringify(data)).length
}

/**
 * Les champs les plus lourds, du plus gros au plus petit.
 * Ne descend que jusqu'aux chaînes volumineuses (typiquement des base64),
 * pour pointer précisément l'élément fautif.
 */
export function heaviestPaths(data, { limit = 3, minBytes = 10_000 } = {}) {
  const found = []

  const walk = (value, path) => {
    if (typeof value === 'string') {
      const size = value.length
      if (size >= minBytes) {
        found.push({ path, size, isDataUrl: value.startsWith('data:') })
      }
      return
    }
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}[${i}]`))
      return
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k)
    }
  }

  walk(data, '')
  return found.sort((a, b) => b.size - a.size).slice(0, limit)
}

/**
 * Vérifie qu'un document peut être écrit. Lève une erreur explicite sinon.
 * L'erreur porte `code`, `size` et `heaviest` pour que l'interface puisse
 * proposer une action plutôt que d'afficher un message brut.
 */
export function assertDocFits(data) {
  const size = measureDoc(data)
  if (size <= SAFE_MAX_BYTES) return size

  const heaviest = heaviestPaths(data)
  const images = heaviest.filter(h => h.isDataUrl)

  let message = `Projet trop volumineux pour être enregistré : ${formatBytes(size)} `
    + `(maximum ${formatBytes(FIRESTORE_MAX_BYTES)}).`

  if (images.length > 0) {
    const detail = images.map(h => `${h.path} (${formatBytes(h.size)})`).join(', ')
    message += ` Des images sont stockées directement dans le projet : ${detail}.`
      + ` Référencez-les depuis votre répertoire d'assets au lieu de les intégrer.`
  } else if (heaviest.length > 0) {
    message += ` Champs les plus lourds : `
      + heaviest.map(h => `${h.path} (${formatBytes(h.size)})`).join(', ') + '.'
  }

  const error = new Error(message)
  error.code = 'doc-too-large'
  error.size = size
  error.heaviest = heaviest
  throw error
}
