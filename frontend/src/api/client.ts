import type {
  Category,
  Listing,
  ListingPhoto,
  ListingRequest,
  LoginPayload,
  LoginResponse,
  MineResponse,
  RefreshResponse,
  SignupPayload,
  SignupResponse,
  UserProfile,
  VerifyOtpPayload,
} from './types'

const API_URL = import.meta.env.VITE_API_URL

export class ApiRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiRequestError'
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(options.headers)
  // Let the browser set Content-Type (with boundary) for multipart/FormData uploads.
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // non-JSON error body; fall back to statusText
    }
    throw new ApiRequestError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  signup: (payload: SignupPayload) =>
    request<SignupResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyOtp: (payload: VerifyOtpPayload) =>
    request<{ message: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  refresh: () => request<RefreshResponse>('/auth/refresh', { method: 'POST' }),

  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  getMe: (accessToken: string) =>
    request<UserProfile>('/users/me', {}, accessToken),

  getCategories: () => request<Category[]>('/categories'),

  createListing: (payload: ListingRequest, accessToken: string) =>
    request<Listing>(
      '/listings',
      { method: 'POST', body: JSON.stringify(payload) },
      accessToken,
    ),

  getListing: (id: string) => request<Listing>(`/listings/${id}`),

  updateListing: (id: string, payload: ListingRequest, accessToken: string) =>
    request<Listing>(
      `/listings/${id}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      accessToken,
    ),

  deleteListing: (id: string, accessToken: string) =>
    request<void>(`/listings/${id}`, { method: 'DELETE' }, accessToken),

  renewListing: (id: string, accessToken: string) =>
    request<Listing>(`/listings/${id}/renew`, { method: 'POST' }, accessToken),

  getMyListings: (
    params: { cursor?: string; limit?: number },
    accessToken: string,
  ) => {
    const search = new URLSearchParams()
    if (params.cursor) search.set('cursor', params.cursor)
    if (params.limit) search.set('limit', String(params.limit))
    const qs = search.toString()
    return request<MineResponse>(`/listings/mine${qs ? `?${qs}` : ''}`, {}, accessToken)
  },

  uploadListingPhoto: (id: string, file: File, accessToken: string) => {
    const formData = new FormData()
    formData.append('photo', file)
    return request<ListingPhoto>(
      `/listings/${id}/photos`,
      { method: 'POST', body: formData },
      accessToken,
    )
  },

  deleteListingPhoto: (id: string, photoId: string, accessToken: string) =>
    request<void>(`/listings/${id}/photos/${photoId}`, { method: 'DELETE' }, accessToken),
}
