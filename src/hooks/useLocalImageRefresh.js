import { useState, useEffect, useCallback } from 'react'
import { hasLocalImages } from '../utils/localImages'

/**
 * Hook that triggers a re-render when local images are being lazily resolved.
 * Place this in components that display product images (VignettePlaceholder, VignetteCanvas).
 *
 * When imageBasePath is '__local__', the first render may get null URLs
 * from buildImageUrl (cache miss). This hook retries after a short delay
 * to pick up the newly-cached blob URLs.
 */
export function useLocalImageRefresh(imageBasePath, dependencyKey) {
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    if (imageBasePath !== '__local__' || !hasLocalImages()) return

    // Retry after 300ms to pick up async cache fills
    const t1 = setTimeout(() => setRefreshCount(c => c + 1), 300)
    // And once more after 1s for slower disks
    const t2 = setTimeout(() => setRefreshCount(c => c + 1), 1000)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [imageBasePath, dependencyKey])

  return refreshCount
}
