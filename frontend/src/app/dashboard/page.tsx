'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Heart, Bell, Search, FileText, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api, UserStats, SavedSearch } from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [savedListings, setSavedListings] = useState<any[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      const [statsData, likedData, searchesData] = await Promise.all([
        api.getUserStats(),
        api.getLikedListings(),
        api.getSavedSearches(),
      ])
      setStats(statsData)
      setSavedListings(likedData)
      setSavedSearches(searchesData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlike = async (listingId: string) => {
    try {
      await api.unlikeListing(listingId)
      setSavedListings(prev => prev.filter(l => l._id !== listingId))
      if (stats) {
        setStats({ ...stats, savedListings: stats.savedListings - 1 })
      }
    } catch (error) {
      console.error('Failed to unlike listing:', error)
    }
  }

  const handleDeleteSearch = async (searchId: string) => {
    try {
      await api.deleteSavedSearch(searchId)
      setSavedSearches(prev => prev.filter(s => s._id !== searchId))
      if (stats) {
        setStats({ ...stats, activeAlerts: stats.activeAlerts - 1 })
      }
    } catch (error) {
      console.error('Failed to delete search:', error)
    }
  }

  // SVG placeholder for listings without images
  const getPlaceholderSvg = (color: string) => `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none">
      <rect width="400" height="300" fill="#f5f5f0"/>
      <rect x="100" y="80" width="200" height="140" rx="8" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="2"/>
      <path d="M150 160 L200 120 L250 160" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="170" cy="130" r="15" fill="${color}" fill-opacity="0.3"/>
    </svg>
  `)}`

  if (authLoading || loading) {
    return (
      <main className="min-h-screen">
        <Navigation />
        <div className="pt-32 pb-16 px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-foreground/70">Loading...</p>
          </div>
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-32 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-4">
              Your <span className="italic">Dashboard</span>
            </h1>
            <p className="text-lg text-foreground/70">
              Welcome back, {user.displayName || user.email}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-card rounded-3xl p-6 shadow-soft border border-border">
              <Heart size={24} className="text-primary mb-3" strokeWidth={1.5} />
              <p className="text-3xl font-serif font-bold text-foreground mb-1">
                {stats?.savedListings || 0}
              </p>
              <p className="text-sm text-foreground/70">Saved Listings</p>
            </div>
            <div className="bg-card rounded-3xl p-6 shadow-soft border border-border">
              <Bell size={24} className="text-primary mb-3" strokeWidth={1.5} />
              <p className="text-3xl font-serif font-bold text-foreground mb-1">
                {stats?.activeAlerts || 0}
              </p>
              <p className="text-sm text-foreground/70">Active Alerts</p>
            </div>
            <div className="bg-card rounded-3xl p-6 shadow-soft border border-border">
              <Search size={24} className="text-primary mb-3" strokeWidth={1.5} />
              <p className="text-3xl font-serif font-bold text-foreground mb-1">
                {stats?.newMatches || 0}
              </p>
              <p className="text-sm text-foreground/70">New Matches</p>
            </div>
            <div className="bg-card rounded-3xl p-6 shadow-soft border border-border">
              <FileText size={24} className="text-primary mb-3" strokeWidth={1.5} />
              <p className="text-3xl font-serif font-bold text-foreground mb-1">
                {stats?.viewedListings || 0}
              </p>
              <p className="text-sm text-foreground/70">Viewed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Saved Listings */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-serif font-bold text-foreground">
                    Saved Listings
                  </h2>
                  <Link
                    href="/search"
                    className="text-primary hover:text-primary/80 transition-colors duration-300 text-sm"
                  >
                    Find More
                  </Link>
                </div>
                
                {savedListings.length === 0 ? (
                  <div className="bg-card-alt rounded-3xl p-8 text-center">
                    <Heart size={32} className="text-foreground/30 mx-auto mb-4" strokeWidth={1.5} />
                    <p className="text-foreground/70 mb-4">No saved listings yet</p>
                    <Link
                      href="/search"
                      className="inline-block px-6 py-3 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300"
                    >
                      Browse Listings
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedListings.map((listing) => (
                      <div
                        key={listing._id}
                        className="group relative bg-card rounded-3xl p-4 shadow-soft hover:shadow-soft-lg transition-all duration-500 border border-border"
                      >
                        <Link href={`/listing/${listing._id}`} className="flex gap-4">
                          <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-card-alt">
                            <img
                              src={listing.images?.[0] || getPlaceholderSvg('#8B7355')}
                              alt={listing.address?.street || 'Listing'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-foreground mb-2 truncate">
                              {listing.address?.street || 'Address unavailable'}
                            </h3>
                            <p className="text-foreground/70 text-sm mb-2">
                              {listing.address?.neighborhood}, {listing.address?.city}
                            </p>
                            <p className="text-2xl font-serif font-bold text-foreground">
                              ${listing.price?.amount?.toLocaleString() || 'N/A'}
                              <span className="text-sm font-sans font-normal text-foreground/60">/mo</span>
                            </p>
                            <p className="text-sm text-foreground/60 mt-1">
                              {listing.bedrooms} bed • {listing.bathrooms} bath
                              {listing.squareFeet && ` • ${listing.squareFeet} sqft`}
                            </p>
                          </div>
                        </Link>
                        <button
                          onClick={() => handleUnlike(listing._id)}
                          className="absolute top-4 right-4 p-2 text-foreground/40 hover:text-red-500 transition-colors"
                          title="Remove from saved"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-8">
              {/* Saved Searches / Alerts */}
              <div className="bg-card rounded-3xl p-6 shadow-soft border border-border">
                <h3 className="text-xl font-serif font-bold text-foreground mb-4">
                  Saved Searches
                </h3>
                
                {savedSearches.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-foreground/70 text-sm mb-4">No saved searches yet</p>
                    <Link
                      href="/search"
                      className="text-primary hover:text-primary/80 text-sm"
                    >
                      Create your first search
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedSearches.map((search) => (
                      <div key={search._id} className="p-4 bg-card-alt rounded-2xl relative">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-foreground pr-8">{search.name}</h4>
                          {(search.newListingsCount || 0) > 0 && (
                            <span className="px-2 py-1 bg-accent text-background text-xs font-semibold rounded-full">
                              {search.newListingsCount} new
                            </span>
                          )}
                        </div>
                        <p className="text-foreground/70 text-sm">
                          {search.criteria.minBedrooms && `${search.criteria.minBedrooms}+ beds`}
                          {search.criteria.maxPrice && ` • Under $${search.criteria.maxPrice.toLocaleString()}`}
                          {search.alertsEnabled && ` • ${search.alertFrequency} alerts`}
                        </p>
                        <button
                          onClick={() => handleDeleteSearch(search._id)}
                          className="absolute top-4 right-4 p-1 text-foreground/40 hover:text-red-500 transition-colors"
                          title="Delete search"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
                <h3 className="text-xl font-serif font-bold text-foreground mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Link
                    href="/search"
                    className="block w-full px-6 py-3 bg-foreground text-background rounded-full text-sm tracking-widest uppercase text-center hover:bg-opacity-90 transition-all duration-300"
                  >
                    Search Listings
                  </Link>
                  <Link
                    href="/research"
                    className="block w-full px-6 py-3 bg-transparent text-primary border border-primary rounded-full text-sm tracking-widest uppercase text-center hover:bg-primary hover:text-background transition-all duration-300"
                  >
                    Research
                  </Link>
                  <Link
                    href="/lease-analyzer"
                    className="block w-full px-6 py-3 bg-transparent text-primary border border-primary rounded-full text-sm tracking-widest uppercase text-center hover:bg-primary hover:text-background transition-all duration-300"
                  >
                    Analyze Lease
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
