import { useState, useEffect, useCallback } from 'react'

/**
 * Polls the image server's /ping endpoint to check if it's alive.
 * Returns { status, info, check }
 *   status: 'checking' | 'online' | 'offline'
 *   info:   { dir, files } | null
 *   check:  () => void  — manual re-check
 */
export function useImageServer(baseUrl, intervalMs = 5000) {
  const [status, setStatus] = useState('checking')
  const [info, setInfo]     = useState(null)

  const check = useCallback(async () => {
    if (!baseUrl) { setStatus('offline'); return }
    const pingUrl = baseUrl.replace(/\/?$/, '/ping')
    try {
      const res = await fetch(pingUrl, { signal: AbortSignal.timeout(2000) })
      if (res.ok) {
        const data = await res.json()
        setStatus('online')
        setInfo(data)
      } else {
        setStatus('offline')
        setInfo(null)
      }
    } catch {
      setStatus('offline')
      setInfo(null)
    }
  }, [baseUrl])

  // Initial check + periodic polling
  useEffect(() => {
    check()
    const id = setInterval(check, intervalMs)
    return () => clearInterval(id)
  }, [check, intervalMs])

  return { status, info, check }
}
