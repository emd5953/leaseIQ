const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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
  minPrice?: number | null
  maxPrice?: number | null
  minBedrooms?: number | null
  maxBedrooms?: number | null
  minBathrooms?: number | null
  maxBathrooms?: number | null
  neighborhoods?: string[]
  requiresDogsAllowed?: boolean
  requiresCatsAllowed?: boolean
  noFeeOnly?: boolean
  requiredAmenities?: string[]
}

export interface SavedSearch {
  _id: string
  name: string
  criteria: UserPreferences
  alertsEnabled: boolean
  alertFrequency: 'immediate' | 'daily' | 'weekly'
  alertMethod: 'email' | 'in-app' | 'both'
  newListingsCount?: number
  createdAt: string
}

export interface UserStats {
  savedListings: number
  activeAlerts: number
  newMatches: number
  viewedListings: number
}

// Helper to get auth headers
let authHeadersFn: () => Record<string, string> = () => ({})

export function setAuthHeadersProvider(fn: () => Record<string, string>) {
  authHeadersFn = fn
}

export const api = {
  // Search endpoints
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

  // User endpoints
  async getUserStats(): Promise<UserStats> {
    const response = await fetch(`${API_URL}/api/user/stats`, {
      headers: authHeadersFn(),
    })
    if (!response.ok) throw new Error('Failed to get stats')
    return response.json()
  },

  async getUserPreferences(): Promise<UserPreferences> {
    const response = await fetch(`${API_URL}/api/user/preferences`, {
      headers: authHeadersFn(),
    })
    if (!response.ok) throw new Error('Failed to get preferences')
    return response.json()
  },

  async updateUserPreferences(prefs: UserPreferences): Promise<UserPreferences> {
    const response = await fetch(`${API_URL}/api/user/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeadersFn() },
      body: JSON.stringify(prefs),
    })
    if (!response.ok) throw new Error('Failed to update preferences')
    return response.json()
  },

  async getLikedListings() {
    const response = await fetch(`${API_URL}/api/user/liked`, {
      headers: authHeadersFn(),
    })
    if (!response.ok) throw new Error('Failed to get liked listings')
    return response.json()
  },

  async likeListing(listingId: string, notes?: string) {
    const response = await fetch(`${API_URL}/api/user/like/${listingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeadersFn() },
      body: JSON.stringify({ notes }),
    })
    if (!response.ok) throw new Error('Failed to like listing')
    return response.json()
  },

  async unlikeListing(listingId: string) {
    const response = await fetch(`${API_URL}/api/user/like/${listingId}`, {
      method: 'DELETE',
      headers: authHeadersFn(),
    })
    if (!response.ok) throw new Error('Failed to unlike listing')
    return response.json()
  },

  async getSavedSearches(): Promise<SavedSearch[]> {
    const response = await fetch(`${API_URL}/api/user/saved-searches`, {
      headers: authHeadersFn(),
    })
    if (!response.ok) throw new Error('Failed to get saved searches')
    return response.json()
  },

  async createSavedSearch(data: {
    name: string
    criteria: UserPreferences
    alertsEnabled?: boolean
    alertFrequency?: 'immediate' | 'daily' | 'weekly'
    alertMethod?: 'email' | 'in-app' | 'both'
  }): Promise<SavedSearch> {
    const response = await fetch(`${API_URL}/api/user/saved-searches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeadersFn() },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create saved search')
    return response.json()
  },

  async deleteSavedSearch(id: string) {
    const response = await fetch(`${API_URL}/api/user/saved-searches/${id}`, {
      method: 'DELETE',
      headers: authHeadersFn(),
    })
    if (!response.ok) throw new Error('Failed to delete saved search')
    return response.json()
  },

  // Research endpoints
  async researchListing(listingId: string, email?: string) {
    const response = await fetch(`${API_URL}/api/research/${listingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!response.ok) throw new Error('Research failed')
    return response.json()
  },

  // Lease analysis endpoints
  async analyzeLease(leaseText: string, email?: string) {
    const response = await fetch(`${API_URL}/api/lease/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaseText, email }),
    })
    if (!response.ok) throw new Error('Lease analysis failed')
    return response.json()
  },

  // Alert endpoints
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
}
