import { useState, useEffect } from 'react'
import { getActiveConnection, subscribeConnection } from '../imageSources/activeConnection'

/**
 * Déclenche un re-render pendant la résolution paresseuse des images.
 * À placer dans les composants affichant des images produit
 * (VignettePlaceholder, VignetteCanvas…).
 *
 * Pour toute source à résolution async (dossier local, Drive, OneDrive…),
 * le premier rendu peut recevoir des URLs null (cache froid). Ce hook :
 *   1. re-render quand une connexion s'active/change (abonnement),
 *   2. retente après 300ms et 1s pour capter les URLs mises en cache.
 */
export function useLocalImageRefresh(imageBasePath, dependencyKey) {
  const [, setRefreshCount] = useState(0)

  useEffect(() => {
    const bump = () => setRefreshCount((c) => c + 1)

    // Re-render dès qu'une source se (re)connecte
    const unsub = subscribeConnection(bump)

    // Retries seulement pour les sources à résolution async (non http direct)
    const isAsyncSource = typeof imageBasePath === 'string' && imageBasePath.startsWith('__')
    let t1, t2
    if (isAsyncSource && getActiveConnection()) {
      t1 = setTimeout(bump, 300)
      t2 = setTimeout(bump, 1000)
    }

    return () => { unsub(); clearTimeout(t1); clearTimeout(t2) }
  }, [imageBasePath, dependencyKey])

  return 0
}
