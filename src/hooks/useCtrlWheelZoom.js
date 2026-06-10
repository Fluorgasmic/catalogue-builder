import { useEffect } from 'react'

/**
 * Ctrl/Cmd + molette (ou pincement trackpad) pour zoomer sur une zone d'aperçu.
 *
 * React attache les listeners `wheel` en mode passif, ce qui empêche
 * preventDefault() — d'où le listener natif avec { passive: false }.
 *
 * @param {React.RefObject} ref       conteneur scrollable de l'aperçu
 * @param {(updater: (z: number) => number) => void} applyZoom
 *        reçoit une fonction (zoomActuel) => nouveauZoom, à appliquer au state
 */
export function useCtrlWheelZoom(ref, applyZoom, { min = 25, max = 300 } = {}) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onWheel = (e) => {
      // Le pincement trackpad arrive comme wheel + ctrlKey sur Chrome/Safari
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      applyZoom(z => Math.round(Math.min(max, Math.max(min, z * factor))))
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [ref, applyZoom, min, max])
}
