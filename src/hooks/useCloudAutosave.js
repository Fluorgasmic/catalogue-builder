import { useEffect, useState } from 'react'
import { createAutosaver } from '../lib/autosave'

/**
 * Branche le moteur d'enregistrement différé sur React.
 *
 * Les trois moments où il faut écrire sans attendre le délai :
 *  - démontage de l'éditeur (retour au tableau de bord) ;
 *  - onglet masqué (changement d'onglet, passage en arrière-plan sur mobile) ;
 *  - `pagehide` (fermeture, rechargement, navigation) — plus fiable que
 *    `beforeunload`, qui ne se déclenche pas sur iOS ni en cas de restauration
 *    depuis le cache de navigation.
 *
 * `subscribe`, `getSnapshot` et `save` doivent avoir une identité stable,
 * sinon l'abonnement est recréé à chaque rendu.
 *
 * Renvoie { status, error } — status ∈ idle | pending | saving | saved | error.
 */
export function useCloudAutosave({ enabled, subscribe, getSnapshot, save, debounceMs }) {
  const [state, setState] = useState({ status: 'idle', error: null })

  useEffect(() => {
    if (!enabled) return

    const saver = createAutosaver({
      save,
      getSnapshot,
      debounceMs,
      onState: (status, error) => setState({ status, error }),
    })

    const unsubscribe = subscribe(saver.notifyChange)
    const flush = () => { saver.flush() }
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush() }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)

    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      flush()          // écrire ce qui reste, au lieu de l'annuler
      saver.dispose()
    }
  }, [enabled, subscribe, getSnapshot, save, debounceMs])

  return state
}
