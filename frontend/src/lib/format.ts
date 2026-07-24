export function formatPrice(kobo: number, currency: string) {
  return `${currency === 'NGN' ? '₦' : currency} ${(kobo / 100).toLocaleString()}`
}
