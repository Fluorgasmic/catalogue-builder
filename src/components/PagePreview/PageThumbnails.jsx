import { useRef, useEffect } from 'react'
import useCatalogStore from '../../store/catalogStore'
import PageCanvas from './PageCanvas'

const THUMB_ZOOM = 12 // very small zoom for thumbnails

export default function PageThumbnails({ pages, currentPage, onSelect }) {
  const ref = useRef()

  // Scroll active thumbnail into view
  useEffect(() => {
    const el = ref.current?.querySelector(`[data-page="${currentPage}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentPage])

  return (
    <div
      ref={ref}
      className="w-24 shrink-0 bg-surface-1 border-r border-surface-4 overflow-y-auto flex flex-col items-center gap-2 py-3"
    >
      {pages.map((page, i) => (
        <button
          key={i}
          data-page={i}
          className={`group relative rounded-md overflow-hidden cursor-pointer transition-all ${
            i === currentPage
              ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface-1'
              : 'opacity-60 hover:opacity-100'
          }`}
          onClick={() => onSelect(i)}
          title={`Page ${i + 1}${page.groupLabel ? ` — ${page.groupLabel}` : ''}`}
        >
          <PageCanvas pageData={page} zoom={THUMB_ZOOM} totalPages={pages.length} />
          <div className="absolute bottom-0 left-0 right-0 text-center bg-black/40 text-[8px] text-white py-0.5">
            {i + 1}
          </div>
        </button>
      ))}
    </div>
  )
}
