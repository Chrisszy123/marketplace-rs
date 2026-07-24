function favoritesKey(userId: string) {
  return `marketplace:favorites:${userId}`
}

export function loadFavoriteIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(favoritesKey(userId))
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function toggleFavorite(userId: string, listingId: string): string[] {
  const ids = loadFavoriteIds(userId)
  const next = ids.includes(listingId) ? ids.filter((id) => id !== listingId) : [listingId, ...ids]
  localStorage.setItem(favoritesKey(userId), JSON.stringify(next))
  return next
}
