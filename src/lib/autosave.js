/**
 * Moteur d'enregistrement automatique différé.
 *
 * Sans React ni store, pour être testable : le hook useCloudAutosave n'en est
 * que le câblage. Les règles tiennent en quatre points, chacun corrigeant une
 * perte de données constatée :
 *
 *  1. TOUTE modification est enregistrée — y compris la première. Un import de
 *     projet ne produit qu'un seul changement dans le store ; l'ignorer, c'est
 *     perdre l'intégralité de l'import.
 *  2. `flush()` écrit immédiatement, sans attendre le délai. Appelé au
 *     démontage et à la fermeture de l'onglet, il évite que l'écriture en
 *     attente soit annulée au moment où l'utilisateur quitte.
 *  3. Un échec d'écriture repasse en « modifications en attente » et remonte
 *     l'erreur : jamais d'échec silencieux affiché comme un succès.
 *  4. Les écritures sont sérialisées, pour qu'une lente ne puisse pas écraser
 *     le résultat d'une plus récente.
 */

/** États possibles, dans l'ordre du cycle de vie normal. */
export const SAVE_STATES = ['idle', 'pending', 'saving', 'saved', 'error']

export function createAutosaver({ save, getSnapshot, onState, debounceMs = 1500 }) {
  let timer = null
  let dirty = false
  let inFlight = null
  let disposed = false

  const emit = (status, error = null) => onState?.(status, error)

  /** À appeler à chaque modification. Reporte l'écriture de `debounceMs`. */
  function notifyChange() {
    if (disposed) return
    dirty = true
    emit('pending')
    clearTimeout(timer)
    timer = setTimeout(flush, debounceMs)
  }

  /** Écrit tout de suite ce qui est en attente. Renvoie la promesse d'écriture. */
  function flush() {
    clearTimeout(timer)
    timer = null
    if (!dirty) return inFlight ?? Promise.resolve()

    // Le contenu est figé maintenant : ce qui sera écrit est bien ce que
    // l'utilisateur voyait à l'instant du flush.
    const snapshot = getSnapshot()
    dirty = false
    emit('saving')

    inFlight = Promise.resolve(inFlight)
      .catch(() => {}) // l'échec précédent a déjà été signalé
      .then(() => save(snapshot))
      .then(() => { emit('saved') })
      .catch((error) => {
        // Rien n'est perdu : la modification redevient en attente et repartira
        // au prochain changement ou au prochain flush.
        dirty = true
        emit('error', error)
      })

    return inFlight
  }

  /** Y a-t-il des modifications non écrites ? */
  function hasPendingChanges() {
    return dirty
  }

  function dispose() {
    disposed = true
    clearTimeout(timer)
    timer = null
  }

  return { notifyChange, flush, hasPendingChanges, dispose }
}
