/**
 * CRUD des projets utilisateur dans Firestore.
 *
 * Modèle : users/{uid}/projects/{projectId}
 *   { name, data, updatedAt, createdAt, productCount }
 *
 * `data` = sortie de exportProject() (config du catalogue) — JAMAIS d'images
 * ni de tokens. Léger, isolé par uid via les Security Rules.
 */

import { getFirebase } from './firebase'

const COL = 'projects'

function projectsCol(dbMod, db, uid) {
  return dbMod.collection(db, 'users', uid, COL)
}

/** Liste les projets d'un user, triés par date de mise à jour décroissante. */
export async function listProjects(uid) {
  const { db, dbMod } = await getFirebase()
  const q = dbMod.query(projectsCol(dbMod, db, uid), dbMod.orderBy('updatedAt', 'desc'))
  const snap = await dbMod.getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Crée un projet, renvoie son id. */
export async function createProject(uid, { name = 'Sans titre', data = {}, productCount = 0 } = {}) {
  const { db, dbMod } = await getFirebase()
  const now = dbMod.serverTimestamp()
  const ref = await dbMod.addDoc(projectsCol(dbMod, db, uid), {
    name, data, productCount, createdAt: now, updatedAt: now,
  })
  return ref.id
}

/** Charge un projet unique. */
export async function loadProject(uid, projectId) {
  const { db, dbMod } = await getFirebase()
  const ref = dbMod.doc(db, 'users', uid, COL, projectId)
  const snap = await dbMod.getDoc(ref)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/** Sauvegarde (merge) un projet existant. */
export async function saveProject(uid, projectId, { name, data, productCount } = {}) {
  const { db, dbMod } = await getFirebase()
  const ref = dbMod.doc(db, 'users', uid, COL, projectId)
  const patch = { updatedAt: dbMod.serverTimestamp() }
  if (name !== undefined) patch.name = name
  if (data !== undefined) patch.data = data
  if (productCount !== undefined) patch.productCount = productCount
  await dbMod.setDoc(ref, patch, { merge: true })
}

/** Duplique un projet, renvoie le nouvel id. */
export async function duplicateProject(uid, projectId) {
  const src = await loadProject(uid, projectId)
  if (!src) return null
  return createProject(uid, {
    name: `${src.name ?? 'Projet'} (copie)`,
    data: src.data ?? {},
    productCount: src.productCount ?? 0,
  })
}

/** Supprime un projet. */
export async function deleteProject(uid, projectId) {
  const { db, dbMod } = await getFirebase()
  await dbMod.deleteDoc(dbMod.doc(db, 'users', uid, COL, projectId))
}
