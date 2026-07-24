const DEVICE_ID_KEY = 'marketplace:device-id'

/**
 * Stable per-browser id so guests can save/view listings locally, the same way an account's
 * localStorage-keyed data works — browsing and saving never require an account.
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function getViewerId(userId: string | undefined | null): string {
  return userId ?? getDeviceId()
}
