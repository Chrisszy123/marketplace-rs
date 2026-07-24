import type { Condition, ListingType } from '../api/types'

export interface ListingDraft {
  id: string
  updatedAt: string
  listingType: ListingType
  categoryId: string
  title: string
  description: string
  priceNaira: string
  location: string
  condition: Condition
  serviceArea: string
  photoCount: number
}

function draftsKey(userId: string) {
  return `marketplace:drafts:${userId}`
}

export function loadDrafts(userId: string): ListingDraft[] {
  try {
    const raw = localStorage.getItem(draftsKey(userId))
    return raw ? (JSON.parse(raw) as ListingDraft[]) : []
  } catch {
    return []
  }
}

export function saveDraft(userId: string, draft: ListingDraft) {
  const drafts = loadDrafts(userId).filter((d) => d.id !== draft.id)
  drafts.unshift({ ...draft, updatedAt: new Date().toISOString() })
  localStorage.setItem(draftsKey(userId), JSON.stringify(drafts))
}

export function deleteDraft(userId: string, id: string) {
  const drafts = loadDrafts(userId).filter((d) => d.id !== id)
  localStorage.setItem(draftsKey(userId), JSON.stringify(drafts))
}

export function getDraft(userId: string, id: string): ListingDraft | undefined {
  return loadDrafts(userId).find((d) => d.id === id)
}
