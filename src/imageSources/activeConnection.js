/**
 * Connexions actives aux sources d'images, par emplacement.
 *
 * La CONFIG sérialisée (providerId, baseUrl, mapping…) vit dans le store Zustand
 * et est persistée. La CONNEXION VIVANTE (handle de dossier, blob URLs, token
 * OAuth en session) ne peut PAS être sérialisée → elle vit ici, en mémoire.
 *
 * Deux emplacements indépendants, parce qu'ils n'ont ni le même contenu ni le
 * même cycle de vie :
 *
 *   PRODUCTS — les photos produits, nommées d'après une colonne du fichier.
 *   ASSETS   — les visuels de mise en page : logos, icônes, badges, fonds.
 *
 * Chacun peut pointer sur un fournisseur différent — produits sur un NAS,
 * assets dans un dossier local, par exemple. C'est la raison d'être des
 * emplacements : une connexion unique obligeait à tout ranger au même endroit.
 *
 * Les composants de rendu lisent la connexion via getActiveConnection() de façon
 * synchrone, et s'abonnent aux changements via subscribeConnection() pour
 * re-render quand une source vient d'être connectée / reconnectée.
 */

export const PRODUCTS = 'products'
export const ASSETS = 'assets'

/** Emplacement par défaut : conserve le comportement des appels historiques. */
const DEFAULT_SLOT = PRODUCTS

const connections = new Map() // slot → connexion vivante
const listeners = new Map()   // slot → Set<fn>

function listenersFor(slot) {
  let set = listeners.get(slot)
  if (!set) { set = new Set(); listeners.set(slot, set) }
  return set
}

export function getActiveConnection(slot = DEFAULT_SLOT) {
  return connections.get(slot) ?? null
}

export function setActiveConnection(conn, slot = DEFAULT_SLOT) {
  connections.set(slot, conn)
  for (const fn of listenersFor(slot)) {
    try { fn(conn, slot) } catch { /* noop */ }
  }
}

export function clearActiveConnection(slot = DEFAULT_SLOT) {
  setActiveConnection(null, slot)
}

/** S'abonner aux changements d'un emplacement. Retourne une fonction de désabonnement. */
export function subscribeConnection(fn, slot = DEFAULT_SLOT) {
  const set = listenersFor(slot)
  set.add(fn)
  return () => set.delete(fn)
}
