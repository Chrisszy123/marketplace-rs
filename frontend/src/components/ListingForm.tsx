import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, ApiRequestError } from '../api/client'
import type { Category, ListingRequest, ListingType, Condition } from '../api/types'

interface ListingFormProps {
  initialValues?: ListingRequest
  submitLabel: string
  onSubmit: (payload: ListingRequest) => Promise<void>
}

export function ListingForm({ initialValues, submitLabel, onSubmit }: ListingFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [topCategoryId, setTopCategoryId] = useState('')
  const [categoryId, setCategoryId] = useState(initialValues?.category_id ?? '')
  const [listingType, setListingType] = useState<ListingType>(
    initialValues?.listing_type ?? 'good',
  )
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [priceNaira, setPriceNaira] = useState(
    initialValues ? String(initialValues.price_kobo / 100) : '',
  )
  const [location, setLocation] = useState(initialValues?.location ?? '')
  const [condition, setCondition] = useState<Condition>(initialValues?.condition ?? 'used')
  const [serviceArea, setServiceArea] = useState(initialValues?.service_area ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  const topLevelCategories = useMemo(() => categories.filter((c) => c.parent_id === null), [categories])
  const subCategories = useMemo(
    () => categories.filter((c) => c.parent_id === topCategoryId),
    [categories, topCategoryId],
  )

  // When editing, derive which top-level category the pre-filled subcategory belongs to.
  useEffect(() => {
    if (!initialValues || !categories.length || topCategoryId) return
    const current = categories.find((c) => c.id === initialValues.category_id)
    if (current?.parent_id) setTopCategoryId(current.parent_id)
  }, [categories, initialValues, topCategoryId])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const priceKobo = Math.round(Number(priceNaira) * 100)
    if (!Number.isFinite(priceKobo) || priceKobo < 0) {
      setError('Enter a valid price')
      return
    }
    if (!categoryId) {
      setError('Choose a category')
      return
    }

    const payload: ListingRequest = {
      category_id: categoryId,
      listing_type: listingType,
      title,
      description,
      price_kobo: priceKobo,
      location,
      ...(listingType === 'good' ? { condition } : { service_area: serviceArea }),
    }

    setIsSubmitting(true)
    try {
      await onSubmit(payload)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
      <div className="mb-4 flex gap-2">
        {(['good', 'service'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setListingType(type)}
            className={`flex-1 rounded-full py-2 text-sm font-medium ${
              listingType === type
                ? 'bg-brand-green text-white'
                : 'border border-brand-dark/20 text-brand-dark'
            }`}
          >
            {type === 'good' ? 'I’m selling a good' : 'I’m offering a service'}
          </button>
        ))}
      </div>

      <label className="mb-3 block text-sm">
        Category
        <select
          required
          value={topCategoryId}
          onChange={(e) => {
            setTopCategoryId(e.target.value)
            setCategoryId('')
          }}
          className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 outline-none focus:border-brand-green"
        >
          <option value="" disabled>
            Select a category
          </option>
          {topLevelCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {topCategoryId && (
        <label className="mb-3 block text-sm">
          Subcategory
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 outline-none focus:border-brand-green"
          >
            <option value="" disabled>
              Select a subcategory
            </option>
            {subCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="mb-3 block text-sm">
        Title
        <input
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 outline-none focus:border-brand-green"
        />
      </label>

      <label className="mb-3 block text-sm">
        Description
        <textarea
          required
          maxLength={5000}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 outline-none focus:border-brand-green"
        />
      </label>

      <label className="mb-3 block text-sm">
        Price (₦)
        <input
          required
          type="number"
          min={0}
          step="0.01"
          value={priceNaira}
          onChange={(e) => setPriceNaira(e.target.value)}
          className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 outline-none focus:border-brand-green"
        />
      </label>

      <label className="mb-3 block text-sm">
        Location
        <input
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 outline-none focus:border-brand-green"
        />
      </label>

      {listingType === 'good' ? (
        <label className="mb-4 block text-sm">
          Condition
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as Condition)}
            className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 outline-none focus:border-brand-green"
          >
            <option value="new">New</option>
            <option value="used">Used</option>
          </select>
        </label>
      ) : (
        <label className="mb-4 block text-sm">
          Service area
          <input
            required
            placeholder="e.g. Lagos-wide, or remote"
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
            className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 outline-none focus:border-brand-green"
          />
        </label>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-brand-green py-2 font-medium text-white disabled:opacity-60"
      >
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
