/**
 * Résolution des visuels de mise en page (logos, icônes, badges, fonds).
 *
 * Un bloc ne stocke plus l'image elle-même mais son NOM dans le répertoire
 * d'assets du client : `{ assetName: 'logo-entreprise.png' }`. Le projet reste
 * léger — c'était la cause des projets impossibles à enregistrer — et le même
 * répertoire sert à tous les visuels qui ne viennent pas du fichier Excel.
 *
 * Rétrocompatibilité : les projets existants embarquent l'image en base64
 * (`src`, `directSrc`, `badgeSrc`). Ces valeurs restent affichées telles
 * quelles, pour ne rien casser tant qu'elles n'ont pas été re-pointées.
 */

import { get as getProvider } from '../imageSources/registry'
import { getActiveConnection, ASSETS } from '../imageSources/activeConnection'

/** Une valeur déjà directement affichable (base64 hérité ou URL absolue) ? */
export function isDirectSrc(value) {
  if (typeof value !== 'string' || !value) return false
  return value.startsWith('data:') || value.startsWith('http://')
    || value.startsWith('https://') || value.startsWith('blob:')
}

/**
 * URL affichable d'un asset, de façon synchrone (pour le rendu).
 * Renvoie null tant que la source n'est pas connectée ou le fichier introuvable.
 */
export function resolveAssetUrl(assetName, providerId) {
  if (!assetName) return null
  if (isDirectSrc(assetName)) return assetName

  const provider = providerId ? getProvider(providerId) : null
  const conn = getActiveConnection(ASSETS)
  if (!provider || !conn) return null

  if (provider.resolveUrlSync) return provider.resolveUrlSync(conn, assetName)
  // Pas de variante synchrone : amorce le chargement, le réabonnement re-rendra.
  provider.resolveUrl?.(conn, assetName)
  return null
}

/**
 * Source affichable d'un bloc porteur d'image, héritage compris.
 * `legacySrc` est l'ancien champ base64 du bloc ; il ne sert que de repli.
 */
export function blockImageSrc({ assetName, legacySrc, providerId }) {
  const resolved = resolveAssetUrl(assetName, providerId)
  if (resolved) return resolved
  return isDirectSrc(legacySrc) ? legacySrc : null
}

/** Liste des assets disponibles, pour le sélecteur à vignettes. */
export function listAssets(providerId) {
  const provider = providerId ? getProvider(providerId) : null
  const conn = getActiveConnection(ASSETS)
  if (!provider?.canList || !conn) return []
  return provider.list?.(conn) ?? []
}
