'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Heart, Bell, Search, FileText, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  // SVG placeholder for mock listings
  const getPlaceholderSvg = (color: string) => `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none">
      <rect width="400" height="300" fill="#f5f5f0"/>
      <rect x="100" y="80" width="200" height="140" rx="8" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="2"/>
      <path d="M150 160 L200 120 L250 160" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="170" cy="130" r="15" fill="${color}" fill-opacity="0.3"/>
    </svg>
  `)}`

  // Mock data - in production, fetch from API
  const savedListings = [
    {
      id: '1',
      title: 'Spacious 2BR in Williamsburg',
      price: 3200,
      address: '123 Bedford Ave, Brooklyn',
      image: getPlaceholderSvg('#8B7355'),
    },
    {
      id: '2',
      title: 'Modern Studio in Manhattan',
      price: 2800,
      address: '456 Broadway, New York',
      image: getPlaceholderSvg('#6B8E6B'),
    },
  ]

  const savedSearches = [
    {
      id: '1',
      name: 'Brooklyn 2BR under $3500',
      criteria: '2 beds • $2500-$3500 • Brooklyn',
      newListings: 5,
    },
    {
      id: '2',
      name: 'Pet-friendly Manhattan',
      criteria: '1-2 beds • Pets OK • Manhattan',
      newListings: 2,
    },
  ]

  const recentActivity = [
    { type: 'research', title: 'Researched listing on Bedford Ave', date: '2 days ago' },
    { type: 'lease', title: 'Analyzed lease for 456 Broadway', date: '5 days ago' },
    { type: 'save', title: 'Saved 3 new listings', date: '1 week ago' },
  ]

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
              Track your saved listings, alerts, and research history
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-card rounded-3xl p-6 shadow-soft border border-border">
              <Heart size={24} className="text-primary mb-3" strokeWidth={1.5} />
              <p className="text-3xl font-serif font-bold text-foreground mb-1">
                {savedListings.length}
              </p>
              <p className="text-sm text-foreground/70">Saved Listings</p>
            </div>
            <div className="bg-card rounded-3xl p-6 shadow-soft border border-border">
              <Bell size={24} className="text-primary mb-3" strokeWidth={1.5} />
              <p className="text-3xl font-serif font-bold text-foreground mb-1">
                {savedSearches.length}
              </p>
              <p className="text-sm text-foreground/70">Active Alerts</p>
            </div>
            <div className="bg-card rounded-3xl p-6 shadow-soft border border-border">
              <Search size={24} className="text-primary mb-3" strokeWidth={1.5} />
              <p className="text-3xl font-serif font-bold text-foreground mb-1">7</p>
              <p className="text-sm text-foreground/70">New Matches</p>
            </div>
            <div className="bg-card rounded-3xl p-6 shadow-soft border border-border">
              <FileText size={24} className="text-primary mb-3" strokeWidth={1.5} />
              <p className="text-3xl font-serif font-bold text-foreground mb-1">2</p>
              <p className="text-sm text-foreground/70">Researched</p>
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
                    View All
                  </Link>
                </div>
                <div className="space-y-4">
                  {savedListings.map((listing) => (
                    <Link
                      key={listing.id}
                      href={`/listing/${listing.id}`}
                      className="group block bg-card rounded-3xl p-4 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-500 border border-border"
                    >
                      <div className="flex gap-4">
                        <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0">
                          <img
                            src={listing.image}
                            alt={listing.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-foreground mb-2 truncate">
                            {listing.title}
                          </h3>
                          <p className="text-foreground/70 text-sm mb-2">{listing.address}</p>
                          <p className="text-2xl font-serif font-bold text-foreground">
                            ${listing.price.toLocaleString()}
                            <span className="text-sm font-sans font-normal text-foreground/60">/mo</span>
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-6">
                  Recent Activity
                </h2>
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 bg-card-alt rounded-2xl"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {activity.type === 'research' && <Search size={18} className="text-primary" strokeWidth={1.5} />}
                        {activity.type === 'lease' && <FileText size={18} className="text-primary" strokeWidth={1.5} />}
                        {activity.type === 'save' && <Heart size={18} className="text-primary" strokeWidth={1.5} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium">{activity.title}</p>
                        <p className="text-foreground/60 text-sm">{activity.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-8">
              {/* Saved Searches */}
              <div className="bg-card rounded-3xl p-6 shadow-soft border border-border">
                <h3 className="text-xl font-serif font-bold text-foreground mb-4">
                  Saved Searches
                </h3>
                <div className="space-y-4">
                  {savedSearches.map((search) => (
                    <div key={search.id} className="p-4 bg-card-alt rounded-2xl">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-foreground">{search.name}</h4>
                        {search.newListings > 0 && (
                          <span className="px-2 py-1 bg-accent text-background text-xs font-semibold rounded-full">
                            {search.newListings} new
                          </span>
                        )}
                      </div>
                      <p className="text-foreground/70 text-sm">{search.criteria}</p>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 px-6 py-3 bg-transparent text-primary border border-primary rounded-full text-sm tracking-widest uppercase hover:bg-primary hover:text-background transition-all duration-300">
                  Create Alert
                </button>
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
