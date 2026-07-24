/**
 * Connexion active à la source d'images.
 *
 * La CONFIG sérialisée (providerId, baseUrl, mapping…) vit dans le store Zustand
 * et est persistée. La CONNEXION VIVANTE (handle de dossier, blob URLs, token
 * OAuth en session) ne peut PAS être sérialisée → elle vit ici, en mémoire.
 *
 * Les composants de rendu lisent la connexion via getActiveConnection() de façon
 * synchrone, et s'abonnent aux changements via subscribe() pour re-render quand
 * une source vient d'être connectée / reconnectée.
 */

let activeConnection = null
const listeners = new Set()

export function getActiveConnection() {
  return activeConnection
}

export function setActiveConnection(conn) {
  activeConnection = conn
  for (const fn of listeners) {
    try { fn(conn) } catch { /* noop */ }
  }
}

export function clearActiveConnection() {
  setActiveConnection(null)
}

/** S'abonner aux changements de connexion. Retourne une fonction de désabonnement. */
export function subscribeConnection(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
