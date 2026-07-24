import { useNavigate } from 'react-router-dom'
import { ListingForm } from '../components/ListingForm'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { ListingRequest } from '../api/types'

export function CreateListingPage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(payload: ListingRequest) {
    const listing = await api.createListing(payload, accessToken as string)
    navigate(`/listings/${listing.id}/edit`, { state: { justCreated: true } })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-10">
      <div className="w-full max-w-lg">
        <h1 className="mb-4 text-2xl font-semibold text-brand-dark-green">Create a listing</h1>
        <ListingForm submitLabel="Publish listing" onSubmit={handleSubmit} />
      </div>
    </main>
  )
}
