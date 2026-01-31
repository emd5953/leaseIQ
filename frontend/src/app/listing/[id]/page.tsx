'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import ListingDetail from '@/components/listing/ListingDetail'

export default function ListingPage() {
  const params = useParams()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchListing(params.id as string)
    }
  }, [params.id])

  const fetchListing = async (id: string) => {
    try {
      const response = await fetch(`/api/search/${id}`)
      if (!response.ok) throw new Error('Listing not found')
      const data = await response.json()
      setListing(data)
    } catch (error) {
      console.error('Error fetching listing:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-32 pb-16">
        {loading ? (
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="animate-pulse space-y-8">
              <div className="h-96 bg-card-alt rounded-3xl" />
              <div className="h-12 bg-card-alt rounded w-3/4" />
              <div className="h-6 bg-card-alt rounded w-1/2" />
            </div>
          </div>
        ) : listing ? (
          <ListingDetail listing={listing} />
        ) : (
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center py-16">
            <h1 className="text-3xl font-serif font-bold text-foreground mb-4">
              Listing not found
            </h1>
            <p className="text-foreground/70">This listing may have been removed or is no longer available.</p>
          </div>
        )}
      </div>
      <Footer />
    </main>
  )
}
