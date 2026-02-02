const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Helper to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('leaseiq_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface SearchFilters {
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
  // Cache for saved listings to avoid repeated API calls
  _savedListingsCache: null as Set<string> | null,
  _savedListingsCacheTime: 0,
  _savedListingsCacheDuration: 60000, // 1 minute

  async getSavedListingIds(): Promise<Set<string>> {
    // Return cached data if fresh
    const now = Date.now()
    if (this._savedListingsCache && (now - this._savedListingsCacheTime) < this._savedListingsCacheDuration) {
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

  async searchListings(filters: SearchFilters = {}, options: SearchOptions = {}) {
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

    const response = await fetch(`${API_URL}/api/search?${params}`)
    if (!response.ok) throw new Error('Search failed')
    return response.json()
  },

  async getRecentListings(limit: number = 20) {
    const response = await fetch(`${API_URL}/api/search/recent?limit=${limit}`)
    if (!response.ok) throw new Error('Failed to fetch recent listings')
    return response.json()
  },

  async getListingById(id: string) {
    const response = await fetch(`${API_URL}/api/search/${id}`)
    if (!response.ok) throw new Error('Listing not found')
    return response.json()
  },

  async researchListing(listingId: string, email?: string) {
    const response = await fetch(`${API_URL}/api/research/${listingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!response.ok) throw new Error('Research failed')
    return response.json()
  },

  async analyzeLease(leaseText: string, email?: string) {
    const response = await fetch(`${API_URL}/api/lease/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaseText, email }),
    })
    if (!response.ok) throw new Error('Lease analysis failed')
    return response.json()
  },

  async processAlerts() {
    const response = await fetch(`${API_URL}/api/alerts/process`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to process alerts')
    return response.json()
  },

  async sendImmediateAlert(savedSearchId: string) {
    const response = await fetch(`${API_URL}/api/alerts/send/${savedSearchId}`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to send alert')
    return response.json()
  },

  // ============ USER ENDPOINTS ============

  async getPreferences(): Promise<UserPreferences> {
    const response = await fetch(`${API_URL}/api/user/preferences`, {
      headers: { ...getAuthHeaders() },
    })
    if (!response.ok) throw new Error('Failed to get preferences')
    return response.json()
  },

  async updatePreferences(preferences: UserPreferences): Promise<UserPreferences> {
    const response = await fetch(`${API_URL}/api/user/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(preferences),
    })
    if (!response.ok) throw new Error('Failed to update preferences')
    return response.json()
  },

  async getSavedListings() {
    const response = await fetch(`${API_URL}/api/user/saved-listings`, {
      headers: { ...getAuthHeaders() },
    })
    if (!response.ok) throw new Error('Failed to get saved listings')
    return response.json()
  },

  async saveListing(listingId: string, notes?: string) {
    const response = await fetch(`${API_URL}/api/user/saved-listings/${listingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ notes }),
    })
    if (!response.ok) throw new Error('Failed to save listing')
    this.invalidateSavedListingsCache() // Clear cache
    return response.json()
  },

  async unsaveListing(listingId: string) {
    const response = await fetch(`${API_URL}/api/user/saved-listings/${listingId}`, {
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
    const response = await fetch(`${API_URL}/api/user/saved-searches`, {
      headers: { ...getAuthHeaders() },
    })
    if (!response.ok) throw new Error('Failed to get saved searches')
    return response.json()
  },

  async createSavedSearch(search: SavedSearch): Promise<SavedSearch> {
    const response = await fetch(`${API_URL}/api/user/saved-searches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(search),
    })
    if (!response.ok) throw new Error('Failed to create saved search')
    return response.json()
  },

  async updateSavedSearch(id: string, search: Partial<SavedSearch>): Promise<SavedSearch> {
    const response = await fetch(`${API_URL}/api/user/saved-searches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(search),
    })
    if (!response.ok) throw new Error('Failed to update saved search')
    return response.json()
  },

  async deleteSavedSearch(id: string) {
    const response = await fetch(`${API_URL}/api/user/saved-searches/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    })
    if (!response.ok) throw new Error('Failed to delete saved search')
    return response.json()
  },

  async testSavedSearchAlert(id: string) {
    const response = await fetch(`${API_URL}/api/user/saved-searches/${id}/test-alert`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    })
    if (!response.ok) throw new Error('Failed to send test alert')
    return response.json()
  },
}
