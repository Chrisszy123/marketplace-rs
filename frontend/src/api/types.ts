export interface SignupPayload {
  email: string
  password: string
  phone_number: string
  display_name: string
}

export interface SignupResponse {
  user_id: string
  message: string
}

export interface VerifyOtpPayload {
  user_id: string
  code: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  user_id: string
}

export interface RefreshResponse {
  access_token: string
}

export interface UserProfile {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  location: string | null
  phone_verified: boolean
  member_since: string
  rating: number | null
}

export interface Category {
  id: string
  parent_id: string | null
  name: string
  slug: string
}

export type ListingType = 'good' | 'service'
export type ListingStatus = 'active' | 'expiring' | 'expired' | 'sold' | 'paused'
export type Condition = 'new' | 'used'

export interface ListingPhoto {
  id: string
  url: string
  position: number
}

export interface Listing {
  id: string
  seller_id: string
  category_id: string
  listing_type: ListingType
  title: string
  description: string
  price_kobo: number
  currency: string
  location: string
  condition: Condition | null
  service_area: string | null
  status: ListingStatus
  is_boosted: boolean
  published_at: string
  expires_at: string
  created_at: string
  updated_at: string
  photos: ListingPhoto[]
}

export interface ListingRequest {
  category_id: string
  listing_type: ListingType
  title: string
  description: string
  price_kobo: number
  location: string
  condition?: Condition
  service_area?: string
}

export interface MineResponse {
  items: Listing[]
  next_cursor: string | null
}
