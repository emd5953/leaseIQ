'use client'

import { useEffect, useState } from 'react'
import ListingCard from './ListingCard'
import { api, SearchOptions } from '@/lib/api'

interface Listing {
  _id: string
  title: string
  price: number
  bedrooms: number
  bathrooms: number
  squareFeet?: number
  address: string
  neighborhood?: string
  images: string[]
  source: string
  petsAllowed?: boolean
  noFee?: boolean
  amenities?: string[]
}

interface SearchResultsProps {
  filters: any
  triggerSearch: number
}

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'bedrooms'

export default function SearchResults({ filters, triggerSearch }: SearchResultsProps) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchListings()
  }, [triggerSearch, sortOption])

  // Auto-refresh every 30 seconds to show new listings
  useEffect(() => {
    const interval = setInterval(() => {
      fetchListings()
    }, 30 * 1000) // 30 seconds

    return () => clearInterval(interval)
  }, [filters, sortOption])

  const getSortOptions = (): SearchOptions => {
    switch (sortOption) {
      case 'price-asc':
        return { sortBy: 'price', sortOrder: 'asc' }
      case 'price-desc':
        return { sortBy: 'price', sortOrder: 'desc' }
      case 'bedrooms':
        return { sortBy: 'bedrooms', sortOrder: 'desc' }
      case 'newest':
      default:
        return { sortBy: 'createdAt', sortOrder: 'desc' }
    }
  }

  const fetchListings = async () => {
    try {
      setError(null)
      
      const sortOptions = getSortOptions()
      
      // Build filter object for API
      const apiFilters: any = {}
      
      if (filters.minPrice) apiFilters.minPrice = parseInt(filters.minPrice)
      if (filters.maxPrice) apiFilters.maxPrice = parseInt(filters.maxPrice)
      if (filters.bedrooms) apiFilters.minBedrooms = parseInt(filters.bedrooms)
      if (filters.bathrooms) apiFilters.minBathrooms = parseInt(filters.bathrooms)
      if (filters.neighborhoods?.length > 0) apiFilters.neighborhoods = filters.neighborhoods
      if (filters.petsAllowed) apiFilters.petsAllowed = true
      if (filters.noFee) apiFilters.noFee = true
      
      const result = await api.searchListings(apiFilters, { limit: 100, ...sortOptions })
      setListings(result.listings || [])
      setTotal(result.total || 0)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchListings()
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-card rounded-3xl p-6 shadow-soft border border-border animate-pulse">
            <div className="h-48 bg-card-alt rounded-2xl mb-4" />
            <div className="h-6 bg-card-alt rounded w-3/4 mb-2" />
            <div className="h-4 bg-card-alt rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-accent/10 rounded-3xl p-8 text-center border border-accent/20">
        <p className="text-accent font-medium mb-2">Unable to load listings</p>
        <p className="text-foreground/70 text-sm">{error}</p>
        <button
          onClick={fetchListings}
          className="mt-4 px-6 py-2 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="bg-card rounded-3xl p-12 text-center shadow-soft border border-border">
        <p className="text-xl font-serif text-foreground mb-2">No listings found</p>
        <p className="text-foreground/70">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <p className="text-foreground/70">
            <span className="font-semibold text-foreground">{total}</span> listings found
          </p>
          {lastUpdated && (
            <p className="text-xs text-foreground/50">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-xs text-primary hover:text-primary/80 underline disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
        <select 
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as SortOption)}
          className="px-4 py-2 bg-card rounded-full border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-sm"
        >
          <option value="newest">Newest First</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="bedrooms">Bedrooms</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {listings.map((listing) => (
          <ListingCard key={listing._id} listing={listing} />
        ))}
      </div>
    </div>
  )
}
