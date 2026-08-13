import { useRef, useState, type TouchEvent } from 'react'
import type { ListingPhoto } from '../../api/types'

const SWIPE_THRESHOLD_PX = 40

function PhotoPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" className="h-16 w-16 text-brand-dark-green/15" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M21 16l-5-5-4 4-2-2-5 5" />
    </svg>
  )
}

interface ListingGalleryProps {
  photos: ListingPhoto[]
  title: string
}

export function ListingGallery({ photos, title }: ListingGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-white shadow-card">
        <PhotoPlaceholder />
      </div>
    )
  }

  const active = photos[activeIndex] ?? photos[0]

  function goTo(index: number) {
    setActiveIndex(((index % photos.length) + photos.length) % photos.length)
  }

  function handleTouchStart(event: TouchEvent) {
    touchStartX.current = event.touches[0].clientX
  }

  function handleTouchEnd(event: TouchEvent) {
    if (touchStartX.current == null) return
    const delta = event.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > SWIPE_THRESHOLD_PX) goTo(activeIndex + (delta < 0 ? 1 : -1))
    touchStartX.current = null
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <div
        className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-2xl bg-white shadow-card lg:flex-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={active.url}
          alt={`${title} — photo ${activeIndex + 1} of ${photos.length}`}
          className="h-full w-full object-cover"
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-dark outline-none transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-dark outline-none transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <div className="absolute bottom-2 right-2 rounded-full bg-brand-dark/60 px-2 py-0.5 text-[11px] font-medium text-white">
              {activeIndex + 1} / {photos.length}
            </div>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto lg:w-20 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`View photo ${index + 1}`}
              aria-current={index === activeIndex}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green lg:h-20 lg:w-20 ${
                index === activeIndex ? 'border-brand-green' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
