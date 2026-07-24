import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ListingForm } from '../components/ListingForm'
import { api, ApiRequestError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Listing, ListingRequest } from '../api/types'

export function EditListingPage() {
  const { id } = useParams<{ id: string }>()
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [listing, setListing] = useState<Listing | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (!id) return
    api
      .getListing(id)
      .then(setListing)
      .catch((err) => setLoadError(err instanceof ApiRequestError ? err.message : 'Failed to load listing'))
  }, [id])

  if (loadError) {
    return <p className="p-8 text-center text-red-600">{loadError}</p>
  }
  if (!listing) {
    return <p className="p-8 text-center text-brand-dark">Loading…</p>
  }

  const initialValues: ListingRequest = {
    category_id: listing.category_id,
    listing_type: listing.listing_type,
    title: listing.title,
    description: listing.description,
    price_kobo: listing.price_kobo,
    location: listing.location,
    condition: listing.condition ?? undefined,
    service_area: listing.service_area ?? undefined,
  }

  async function handleSubmit(payload: ListingRequest) {
    const updated = await api.updateListing(id as string, payload, accessToken as string)
    setListing(updated)
    navigate(`/listings/${updated.id}`)
  }

  async function handlePhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !listing) return
    setPhotoError(null)
    setIsUploading(true)
    try {
      const photo = await api.uploadListingPhoto(listing.id, file, accessToken as string)
      setListing({ ...listing, photos: [...listing.photos, photo] })
    } catch (err) {
      setPhotoError(err instanceof ApiRequestError ? err.message : 'Failed to upload photo')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handlePhotoDelete(photoId: string) {
    if (!listing) return
    try {
      await api.deleteListingPhoto(listing.id, photoId, accessToken as string)
      setListing({ ...listing, photos: listing.photos.filter((p) => p.id !== photoId) })
    } catch (err) {
      setPhotoError(err instanceof ApiRequestError ? err.message : 'Failed to delete photo')
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-brand-bg px-4 py-10">
      <div className="w-full max-w-lg">
        <h1 className="mb-4 text-2xl font-semibold text-brand-dark-green">Edit listing</h1>
        <ListingForm
          key={listing.id}
          initialValues={initialValues}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
        />
      </div>

      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-brand-dark-green">Photos</h2>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {listing.photos.map((photo) => (
            <div key={photo.id} className="relative">
              <img src={photo.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => handlePhotoDelete(photo.id)}
                className="absolute right-1 top-1 rounded-full bg-brand-dark/80 px-1.5 text-xs text-white"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoSelected}
          disabled={isUploading || listing.photos.length >= 8}
        />
        {photoError && <p className="mt-2 text-sm text-red-600">{photoError}</p>}
      </div>
    </main>
  )
}
