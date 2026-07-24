/**
 * Point d'entrée unique Firebase (app + auth + firestore).
 *
 * Chargement dynamique : le SDK Firebase (~200 kB) n'est importé que si
 * l'auth est activée, pour ne pas alourdir le bundle en mode accès libre.
 * Toutes les parties de l'app (AuthGate, Firestore) réutilisent la MÊME
 * instance d'app via ce module — jamais de double initializeApp().
 */

import { firebaseConfig, authEnabled } from '../firebaseConfig'

let servicesPromise = null

/**
 * Charge et initialise Firebase une seule fois.
 * @returns {Promise<{ app, auth, authMod, db, dbMod }>}
 */
export function getFirebase() {
  if (!authEnabled) {
    return Promise.reject(new Error('Firebase désactivé (apiKey vide)'))
  }
  if (!servicesPromise) {
    servicesPromise = Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]).then(([{ initializeApp }, authMod, dbMod]) => {
      const app = initializeApp(firebaseConfig)
      const auth = authMod.getAuth(app)
      const db = dbMod.getFirestore(app)
      return { app, auth, authMod, db, dbMod }
    })
  }
  return servicesPromise
}

/** Uid du user courant, ou null. */
export async function currentUid() {
  const { auth } = await getFirebase()
  return auth.currentUser?.uid ?? null
}
