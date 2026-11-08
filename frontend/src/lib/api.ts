export const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

async function readResponse(response: Response, fallback: string) {
  const result = await response.json().catch(() => null)
  if (!response.ok || result == null)
    throw new Error(typeof result?.error === 'string' ? result.error : fallback)
  return result
}

// Helper to get auth headers
export function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('leaseiq_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface SearchFilters {
  q?: string
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  maxBedrooms?: number
  minBathrooms?: number
  maxBathrooms?: number
  neighborhoods?: string[]
  petsAllowed?: boolean
  noFee?: boolean
  amenities?: string[]
  minSquareFeet?: number
  maxSquareFeet?: number
}

export interface SearchOptions {
  page?: number
  limit?: number
  sortBy?: 'price' | 'bedrooms' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface UserPreferences {
  userId?: string
  minPrice?: number | null
  maxPrice?: number | null
  minBedrooms?: number | null
  maxBedrooms?: number | null
  minBathrooms?: number | null
  maxBathrooms?: number | null
  neighborhoods?: string[]
  requiredAmenities?: string[]
  requiresDogsAllowed?: boolean
  requiresCatsAllowed?: boolean
  noFeeOnly?: boolean
  maxListingAgeDays?: number | null
}

export interface SavedSearch {
  _id?: string
  name: string
  criteria: UserPreferences
  alertsEnabled: boolean
  alertFrequency: 'immediate' | 'daily' | 'weekly'
  alertMethod: 'email' | 'in-app' | 'both'
  isActive?: boolean
}

export const api = {
  async uploadProperty(lease: File | null, floorplan: File | null, email?: string) {
    if (!lease && !floorplan) throw new Error('Choose a lease document or floor plan first.')
    const headers = getAuthHeaders()
    if (!('Authorization' in headers)) throw new Error('Sign in to analyze your documents.')
    const form = new FormData()
    let endpoint = '/api/property/analyze'
    if (lease && !floorplan) {
      endpoint = '/api/lease/upload'
      form.append('file', lease)
    } else {
      if (lease) form.append('lease', lease)
      if (floorplan) form.append('floorplan', floorplan)
      if (!lease) endpoint = '/api/property/analyze-floorplan-only'
    }
    if (email) form.append('email', email)
    form.append('sendEmail', email ? 'true' : 'false')
    const response = await apiFetch(
      `${API_URL}${endpoint}`,
      { method: 'POST', headers, body: form },
      180000,
    )
    if (response.status === 401)
      throw new Error('Your session expired. Sign in again to analyze your documents.')
    const data = await readResponse(
      response,
      'Document analysis is temporarily unavailable. Please retry.',
    )
    if (!data.analysis || data.success === false)
      throw new Error(data.error || 'Analysis returned incomplete results. Please retry.')
    const analysis = data.analysis.lease
      ? { ...data.analysis.lease, floorPlan: data.analysis.floorPlan }
      : data.analysis
    return { ...data, analysis }
  },

  // Cache for saved listings to avoid repeated API calls
  _savedListingsCache: null as Set<string> | null,
  _savedListingsCacheTime: 0,
  _savedListingsCacheDuration: 60000, // 1 minute

  async getSavedListingIds(): Promise<Set<string>> {
    // Return cached data if fresh
    const now = Date.now()
    if (
      this._savedListingsCache &&
      now - this._savedListingsCacheTime < this._savedListingsCacheDuration
    ) {
      return this._savedListingsCache
    }

    // Fetch fresh data
    try {
      const listings = await this.getSavedListings()
      this._savedListingsCache = new Set(listings.map((l: any) => l._id))
      this._savedListingsCacheTime = now
      return this._savedListingsCache
    } catch {
      return new Set()
    }
  },

  invalidateSavedListingsCache() {
    this._savedListingsCache = null
    this._savedListingsCacheTime = 0
  },

  async searchListings(
    filters: SearchFilters = {},
    options: SearchOptions = {},
    signal?: AbortSignal,
  ) {
    const params = new URLSearchParams()

    Object.entries({ ...filters, ...options }).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','))
        } else {
          params.append(key, String(value))
        }
      }
    })

    // Add cache-busting timestamp to ensure fresh data
    params.append('_t', Date.now().toString())

    const response = await apiFetch(`${API_URL}/api/search?${params}`, { signal })
    const result = await readResponse(
      response,
      'Listing search is temporarily unavailable. Please retry.',
    )
    if (!Array.isArray(result.listings))
      throw new Error('Listing search returned incomplete results. Please retry.')
    return result
  },

  async getRecentListings(limit: number = 20) {
    const response = await apiFetch(`${API_URL}/api/search/recent?limit=${limit}`)
    if (!response.ok) throw new Error('Failed to fetch recent listings')
    return response.json()
  },

  async getListingById(id: string) {
    const response = await apiFetch(`${API_URL}/api/search/${id}`)
    return readResponse(response, 'This listing is temporarily unavailable. Please retry.')
  },

  async researchAddress(street: string, borough: string, signal?: AbortSignal) {
    const response = await apiFetch(`${API_URL}/api/research/address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ street, borough }),
      signal,
    })
    return readResponse(response, 'Property research is temporarily unavailable. Please retry.')
  },

  async researchListing(listingId: string, email?: string, signal?: AbortSignal) {
    const response = await apiFetch(`${API_URL}/api/research/${listingId}`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ email }),
    })
    return readResponse(response, 'Property research is temporarily unavailable. Please retry.')
  },

  async analyzeDocuments(form: FormData, signal?: AbortSignal) {
    return apiJson('/api/property/analyze', { method: 'POST', body: form, signal }, 180000)
  },
  async analysisStatus() {
    return apiJson('/api/property/status')
  },
  async getNotifications() {
    return apiJson('/api/alerts/notifications')
  },
  async readNotification(id: string) {
    return apiJson(`/api/alerts/notifications/${id}/read`, { method: 'PATCH' })
  },

  // ============ USER ENDPOINTS ============

  async getPreferences(): Promise<UserPreferences> {
    const response = await apiFetch(`${API_URL}/api/user/preferences`, {
      headers: { ...getAuthHeaders() },
    })
    if (!response.ok) throw new Error('Failed to get preferences')
    return response.json()
  },

  async updatePreferences(preferences: UserPreferences): Promise<UserPreferences> {
    const response = await apiFetch(`${API_URL}/api/user/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(preferences),
    })
    if (!response.ok) throw new Error('Failed to update preferences')
    return response.json()
  },

  async getSavedListings() {
    const response = await apiFetch(`${API_URL}/api/user/saved-listings`, {
      headers: { ...getAuthHeaders() },
    })
    if (!response.ok) throw new Error('Failed to get saved listings')
    return response.json()
  },

  async saveListing(listingId: string, notes?: string) {
    const response = await apiFetch(`${API_URL}/api/user/saved-listings/${listingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ notes }),
    })
    if (!response.ok) throw new Error('Failed to save listing')
    this.invalidateSavedListingsCache() // Clear cache
    return response.json()
  },

  async updateSavedListingStatus(
    listingId: string,
    status: 'interested' | 'touring' | 'applied' | 'lease' | 'moved',
  ) {
    const response = await apiFetch(`${API_URL}/api/user/saved-listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ status }),
    })
    if (!response.ok) throw new Error('Failed to update listing status')
    return response.json()
  },

  async unsaveListing(listingId: string) {
    const response = await apiFetch(`${API_URL}/api/user/saved-listings/${listingId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    })
    if (!response.ok) throw new Error('Failed to unsave listing')
    this.invalidateSavedListingsCache() // Clear cache
    return response.json()
  },

  async checkListingSaved(listingId: string): Promise<{ isSaved: boolean }> {
    // Use cached data if available
    const savedIds = await this.getSavedListingIds()
    return { isSaved: savedIds.has(listingId) }
  },

  async getSavedSearches(): Promise<SavedSearch[]> {
    const response = await apiFetch(`${API_URL}/api/user/saved-searches`, {
      headers: { ...getAuthHeaders() },
    })
    if (!response.ok) throw new Error('Failed to get saved searches')
    return response.json()
  },

  async createSavedSearch(search: SavedSearch): Promise<SavedSearch> {
    const response = await apiFetch(`${API_URL}/api/user/saved-searches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(search),
    })
    if (!response.ok) throw new Error('Failed to create saved search')
    return response.json()
  },

  async updateSavedSearch(id: string, search: Partial<SavedSearch>): Promise<SavedSearch> {
    const response = await apiFetch(`${API_URL}/api/user/saved-searches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(search),
    })
    if (!response.ok) throw new Error('Failed to update saved search')
    return response.json()
  },

  async deleteSavedSearch(id: string) {
    const response = await apiFetch(`${API_URL}/api/user/saved-searches/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    })
    if (!response.ok) throw new Error('Failed to delete saved search')
    return response.json()
  },

  async testSavedSearchAlert(id: string) {
    const response = await apiFetch(`${API_URL}/api/user/saved-searches/${id}/test-alert`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    })
    const result = await readResponse(response, 'Failed to check alerts. Please retry.')
    if (!result.success) throw new Error(result.error || 'Alert delivery could not be confirmed.')
    return result
  },
}

export async function apiFetch(url: string, init: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (init.signal?.aborted) controller.abort()
  init.signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    // Buffer within the deadline, so a stalled response body cannot bypass the timeout.
    const body = await response.arrayBuffer()
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('leaseiq-session-expired'))
      throw new Error('Your session expired. Sign in again to continue.')
    }
    return new Response(body.byteLength ? body : null, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  } catch (error) {
    if (controller.signal.aborted && !init.signal?.aborted)
      throw new Error('The request timed out. Please retry.')
    throw error
  } finally {
    clearTimeout(timer)
    init.signal?.removeEventListener('abort', abort)
  }
}
export async function apiJson(path: string, init: RequestInit = {}, timeoutMs = 30000) {
  const response = await apiFetch(
    API_URL + path,
    {
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...getAuthHeaders(),
        ...init.headers,
      },
    },
    timeoutMs,
  )
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Request failed. Please retry.')
  return data
}
