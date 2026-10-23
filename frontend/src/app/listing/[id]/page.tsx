'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import ListingDetail from '@/components/listing/ListingDetail'

export default function ListingPage() {
  const params = useParams()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let current = true
    setLoading(true); setError(''); setListing(null)
    api.getListingById(String(params.id)).then(data => { if (current) setListing(data) })
      .catch(error => { if (current) setError(error.message) })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [params.id, retry])

  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-32 pb-16">
        {loading ? (
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div role="status" aria-label="Loading property details" className="animate-pulse space-y-8">
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
              Property unavailable
            </h1>
            <p role="alert" className="text-foreground/70">{error || 'We could not load this property. Please try again.'}</p><button onClick={() => setRetry(v => v + 1)} className="mt-5 mr-5 rounded-full bg-primary px-5 py-3 text-sm text-white">Retry listing</button><Link href="/research" className="mt-5 inline-block text-primary underline">Research a street address instead</Link>
          </div>
        )}
      </div>
      <Footer />
    </main>
  )
}
