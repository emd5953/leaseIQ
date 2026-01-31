'use client'

import { useEffect, useState } from 'react'
import ListingCard from './ListingCard'

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

export default function SearchResults() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchListings()
  }, [])

  const fetchListings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/search/recent?limit=20')
      if (!response.ok) throw new Error('Failed to fetch listings')
      const data = await response.json()
      setListings(data.listings || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
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
        <p className="text-foreground/70">
          <span className="font-semibold text-foreground">{listings.length}</span> listings found
        </p>
        <select className="px-4 py-2 bg-card rounded-full border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-sm">
          <option>Newest First</option>
          <option>Price: Low to High</option>
          <option>Price: High to Low</option>
          <option>Bedrooms</option>
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
