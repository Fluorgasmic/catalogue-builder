import { useState, useEffect, useCallback } from 'react'
import { get as getProvider } from '../imageSources/registry'
import {
  getActiveConnection, setActiveConnection, clearActiveConnection, subscribeConnection,
} from '../imageSources/activeConnection'

/**
 * Cycle de vie d'une connexion à une source d'images, pour un emplacement donné
 * (photos produits ou répertoire d'assets).
 *
 * Connexion, restauration au chargement, reconnexion après perte de permission
 * et déconnexion suivent exactement les mêmes règles quel que soit l'emplacement :
 * la logique vit ici plutôt qu'en double dans chaque panneau.
 *
 * @param slot     emplacement (PRODUCTS | ASSETS)
 * @param source   { providerId, config } issu du store
 * @param onConfig callback appelé avec la config sérialisée à persister
 */
export function useSourceConnection(slot, source, onConfig) {
  const providerId = source?.providerId ?? null
  const provider = providerId ? getProvider(providerId) : null

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [needsReconnect, setNeedsReconnect] = useState(false)
  const [, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  // Re-render quand la connexion de CET emplacement change.
  useEffect(() => subscribeConnection(refresh, slot), [slot, refresh])

  // Restauration au montage : reconnexion transparente si la permission tient
  // encore, sinon on demande un clic (le navigateur l'exige après rechargement).
  useEffect(() => {
    let cancelled = false
    async function tryRestore() {
      if (!provider?.restore || getActiveConnection(slot)) return
      try {
        const { connection, needsUserAction } = await provider.restore(source?.config ?? {}, slot)
        if (cancelled) return
        if (needsUserAction) {
          setNeedsReconnect(true)
          if (connection) setActiveConnection(connection, slot) // garde le handle pour le regrant
        } else if (connection) {
          setActiveConnection(connection, slot)
        }
      } catch { /* silencieux : l'utilisateur peut toujours connecter à la main */ }
    }
    tryRestore()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, slot])

  const connect = useCallback(async () => {
    if (!provider) return
    setBusy(true); setError(null); setNeedsReconnect(false)
    try {
      const conn = await provider.connect(source?.config ?? {}, slot)
      setActiveConnection(conn, slot)
      onConfig?.(provider.serialize?.(conn) ?? {})
    } catch (err) {
      if (err?.name !== 'AbortError') setError('Connexion impossible.')
    } finally {
      setBusy(false); refresh()
    }
  }, [provider, source, slot, onConfig, refresh])

  const reconnect = useCallback(async () => {
    if (!provider?.requestPermission) return connect()
    setBusy(true); setError(null)
    try {
      const conn = await provider.requestPermission(getActiveConnection(slot))
      if (conn) {
        setActiveConnection(conn, slot)
        onConfig?.(provider.serialize?.(conn) ?? {})
        setNeedsReconnect(false)
      } else {
        setError('Permission refusée.')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setError('Reconnexion impossible.')
    } finally {
      setBusy(false); refresh()
    }
  }, [provider, slot, onConfig, connect, refresh])

  const disconnect = useCallback(() => {
    const conn = getActiveConnection(slot)
    if (conn && provider) provider.disconnect?.(conn, slot)
    clearActiveConnection(slot)
    setNeedsReconnect(false); setError(null); refresh()
  }, [provider, slot, refresh])

  const conn = getActiveConnection(slot)
  const isConnected = Boolean(conn) && !needsReconnect && !conn.pending

  return {
    provider, conn, isConnected, busy, error, needsReconnect,
    count: isConnected && provider ? (provider.count?.(conn) ?? 0) : 0,
    connect, reconnect, disconnect, refresh,
  }
}
