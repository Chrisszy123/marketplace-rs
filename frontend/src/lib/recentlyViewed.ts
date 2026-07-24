const MAX_ITEMS = 20

function recentlyViewedKey(userId: string) {
  return `marketplace:recently-viewed:${userId}`
}

export function loadRecentlyViewed(userId: string): string[] {
  try {
    const raw = localStorage.getItem(recentlyViewedKey(userId))
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function recordView(userId: string, listingId: string) {
  const ids = loadRecentlyViewed(userId).filter((id) => id !== listingId)
  ids.unshift(listingId)
  localStorage.setItem(recentlyViewedKey(userId), JSON.stringify(ids.slice(0, MAX_ITEMS)))
}
