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
