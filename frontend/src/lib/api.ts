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

export const api = {
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
}
