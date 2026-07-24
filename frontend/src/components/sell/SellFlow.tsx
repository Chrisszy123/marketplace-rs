import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiRequestError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { SelectField, TextAreaField, TextField } from '../ui/Field'
import { deleteDraft, getDraft, saveDraft, type ListingDraft } from '../../lib/drafts'
import type { Category, Condition, ListingType } from '../../api/types'

const STEPS = ['Photos', 'Category', 'Details', 'Review'] as const

function blankDraft(id: string): ListingDraft {
  return {
    id,
    updatedAt: new Date().toISOString(),
    listingType: 'good',
    categoryId: '',
    title: '',
    description: '',
    priceNaira: '',
    location: '',
    condition: 'used',
    serviceArea: '',
    photoCount: 0,
  }
}

interface SellFlowProps {
  draftId?: string
  onDone: () => void
}

export function SellFlow({ draftId, onDone }: SellFlowProps) {
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()
  const idRef = useRef(draftId ?? crypto.randomUUID())

  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [photos, setPhotos] = useState<File[]>([])
  const [resumedPhotoCount, setResumedPhotoCount] = useState(0)
  const [topCategoryId, setTopCategoryId] = useState('')
  const [form, setForm] = useState<ListingDraft>(() => {
    if (draftId && user) {
      const existing = getDraft(user.id, draftId)
      if (existing) return existing
    }
    return blankDraft(idRef.current)
  })
  const [error, setError] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (draftId && user) {
      const existing = getDraft(user.id, draftId)
      if (existing) {
        setForm(existing)
        setResumedPhotoCount(existing.photoCount)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId])

  const topLevelCategories = useMemo(() => categories.filter((c) => c.parent_id === null), [categories])
  const subCategories = useMemo(
    () => categories.filter((c) => c.parent_id === topCategoryId),
    [categories, topCategoryId],
  )

  useEffect(() => {
    if (!user || published) return
    const timer = window.setTimeout(() => {
      const hasContent = form.title || form.description || form.categoryId || photos.length > 0
      if (hasContent) saveDraft(user.id, { ...form, photoCount: photos.length || resumedPhotoCount })
    }, 600)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, photos.length])

  function update<K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    setPhotos((prev) => [...prev, ...files].slice(0, 8))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  function canAdvance() {
    if (step === 0) return true
    if (step === 1) return Boolean(form.categoryId)
    if (step === 2) {
      const hasPrice = form.priceNaira !== '' && Number(form.priceNaira) >= 0
      const hasAdaptive =
        form.listingType === 'good' ? Boolean(form.condition) : form.serviceArea.trim().length > 0
      return Boolean(form.title.trim() && form.description.trim() && form.location.trim() && hasPrice && hasAdaptive)
    }
    return true
  }

  async function handlePublish() {
    if (!accessToken || !user) return
    setError(null)
    setIsPublishing(true)
    try {
      const listing = await api.createListing(
        {
          category_id: form.categoryId,
          listing_type: form.listingType,
          title: form.title.trim(),
          description: form.description.trim(),
          price_kobo: Math.round(Number(form.priceNaira) * 100),
          location: form.location.trim(),
          ...(form.listingType === 'good'
            ? { condition: form.condition }
            : { service_area: form.serviceArea.trim() }),
        },
        accessToken,
      )
      for (const photo of photos) {
        await api.uploadListingPhoto(listing.id, photo, accessToken)
      }
      deleteDraft(user.id, idRef.current)
      setPublished(true)
      window.setTimeout(() => {
        onDone()
        navigate(`/listings/${listing.id}`)
      }, 1100)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to publish listing')
    } finally {
      setIsPublishing(false)
    }
  }

  if (published) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-h3 text-brand-dark-green">Listing published</p>
        <p className="text-body-sm text-brand-dark/60">Taking you there now…</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex gap-1.5">
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-brand-green' : 'bg-brand-dark/10'}`}
          />
        ))}
      </div>

      {step === 0 && (
        <div>
          <p className="mb-1 text-h3 text-brand-dark-green">Add photos</p>
          <p className="mb-4 text-body-sm text-brand-dark/60">
            Listings with clear photos get messaged more. Up to 8 — first one's the cover.
          </p>
          {resumedPhotoCount > 0 && photos.length === 0 && (
            <p className="mb-3 rounded-lg bg-brand-warning/10 px-3 py-2 text-caption text-brand-warning">
              Resuming a draft with {resumedPhotoCount} photo{resumedPhotoCount === 1 ? '' : 's'} — photos
              aren't saved in drafts, please add them again.
            </p>
          )}
          <div className="grid grid-cols-4 gap-2">
            {photos.map((file, index) => (
              <div key={`${file.name}-${index}`} className="relative aspect-square overflow-hidden rounded-xl">
                <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-dark-green/80 text-xs text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < 8 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-dark/20 text-brand-dark/40 outline-none transition hover:border-brand-green hover:text-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
                <span className="text-caption">Add</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-h3 text-brand-dark-green">What are you listing?</p>
          <div className="flex gap-2">
            {(['good', 'service'] as ListingType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => update('listingType', type)}
                className={`flex-1 rounded-full py-2.5 text-body-sm font-semibold outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${
                  form.listingType === type
                    ? 'bg-brand-green text-white'
                    : 'border border-brand-dark/15 text-brand-dark'
                }`}
              >
                {type === 'good' ? 'A good' : 'A service'}
              </button>
            ))}
          </div>

          <SelectField
            label="Category"
            id="sell-top-category"
            value={topCategoryId}
            onChange={(e) => {
              setTopCategoryId(e.target.value)
              update('categoryId', '')
            }}
          >
            <option value="" disabled>
              Select a category
            </option>
            {topLevelCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>

          {topCategoryId && (
            <SelectField
              label="Subcategory"
              id="sell-subcategory"
              value={form.categoryId}
              onChange={(e) => update('categoryId', e.target.value)}
            >
              <option value="" disabled>
                Select a subcategory
              </option>
              {subCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <TextField
            label="Title"
            id="sell-title"
            maxLength={200}
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
          />
          <TextAreaField
            label="Description"
            id="sell-description"
            rows={4}
            maxLength={5000}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
          <TextField
            label="Price (₦)"
            id="sell-price"
            type="number"
            min={0}
            step="0.01"
            value={form.priceNaira}
            onChange={(e) => update('priceNaira', e.target.value)}
          />
          <TextField
            label="Location"
            id="sell-location"
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
          />
          {form.listingType === 'good' ? (
            <SelectField
              label="Condition"
              id="sell-condition"
              value={form.condition}
              onChange={(e) => update('condition', e.target.value as Condition)}
            >
              <option value="new">New</option>
              <option value="used">Used</option>
            </SelectField>
          ) : (
            <TextField
              label="Service area"
              id="sell-service-area"
              placeholder="e.g. Lagos-wide, or remote"
              value={form.serviceArea}
              onChange={(e) => update('serviceArea', e.target.value)}
            />
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="mb-4 text-h3 text-brand-dark-green">Ready to publish</p>
          <div className="mb-4 space-y-1.5 rounded-xl bg-brand-bg p-4 text-body-sm">
            <p className="font-semibold text-brand-dark">{form.title || 'Untitled listing'}</p>
            <p className="text-brand-green font-semibold">
              ₦{form.priceNaira ? Number(form.priceNaira).toLocaleString() : '0'}
            </p>
            <p className="text-brand-dark/60">{form.location}</p>
            <p className="text-brand-dark/60">{photos.length} photo{photos.length === 1 ? '' : 's'} attached</p>
          </div>
          {error && <p className="mb-3 text-body-sm text-brand-error">{error}</p>}
        </div>
      )}

      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="rounded-full border border-brand-dark/15 px-5 py-2.5 text-body-sm font-semibold text-brand-dark outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
          >
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!canAdvance()}
            onClick={() => setStep((s) => s + 1)}
            className="ml-auto rounded-full bg-brand-green px-6 py-2.5 text-body-sm font-semibold text-white outline-none transition disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={isPublishing}
            onClick={handlePublish}
            className="ml-auto rounded-full bg-brand-green px-6 py-2.5 text-body-sm font-semibold text-white outline-none transition disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
          >
            {isPublishing ? 'Publishing…' : 'Publish listing'}
          </button>
        )}
      </div>
    </div>
  )
}
