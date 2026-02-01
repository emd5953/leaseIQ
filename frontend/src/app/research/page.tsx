'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Shield, AlertTriangle, CheckCircle, Mail, Link, MapPin, Star, Loader2, Lightbulb, ExternalLink, Utensils, Music, Trees, ShoppingBag, Users, Bike } from 'lucide-react'

interface LandlordReview {
  source: string;
  rating?: number;
  comment: string;
}

interface BuildingViolation {
  type: string;
  description: string;
  status?: string;
}

interface NeighborhoodInfo {
  crimeLevel?: string;
  crimeDetails?: string;
  walkScore?: number;
  transitScore?: number;
  bikeScore?: number;
  nearbyAmenities?: string[];
  dining?: string[];
  nightlife?: string;
  culture?: string[];
  parks?: string[];
  groceryStores?: string[];
  vibe?: string;
  demographics?: string;
}

interface ResourceLink {
  name: string;
  url: string;
}

interface ResearchData {
  summary: string;
  landlordReviews?: LandlordReview[];
  violations?: BuildingViolation[];
  neighborhood?: NeighborhoodInfo;
  tips?: string[];
  resourceLinks?: ResourceLink[];
}

export default function ResearchPage() {
  const searchParams = useSearchParams()
  const listingIdFromUrl = searchParams.get('listingId')
  
  const [listingInput, setListingInput] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [research, setResearch] = useState<ResearchData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (listingIdFromUrl) {
      setListingInput(listingIdFromUrl)
    }
  }, [listingIdFromUrl])

  const extractListingId = (input: string): string | null => {
    if (!input.trim()) return null
    if (input.includes('/listing/')) {
      const match = input.match(/\/listing\/([a-zA-Z0-9]+)/)
      return match ? match[1] : null
    }
    return input.trim()
  }

  const handleResearch = async () => {
    const listingId = extractListingId(listingInput)
    if (!listingId) {
      setError('Please enter a listing ID or URL')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/research/${listingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || undefined }),
      })

      if (!response.ok) throw new Error('Research failed')
      
      const data = await response.json()
      setResearch(data.research)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to research listing')
    } finally {
      setLoading(false)
    }
  }

  const getRatingColor = (rating?: number) => {
    if (!rating) return 'text-foreground/50'
    if (rating >= 4) return 'text-green-600'
    if (rating >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-32 pb-16 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-4">
              Research <span className="italic">before</span> you tour
            </h1>
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
              Get landlord reviews, building violations, and neighborhood insights.
            </p>
          </div>

          {/* Research Form */}
          {!research && (
            <div className="bg-card rounded-3xl p-8 md:p-12 shadow-soft border border-border">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <span className="flex items-center gap-2">
                      <Link size={16} strokeWidth={1.5} />
                      Listing ID
                    </span>
                  </label>
                  <input
                    type="text"
                    value={listingInput}
                    onChange={(e) => setListingInput(e.target.value)}
                    placeholder="Paste listing ID (use Copy ID button from listing page)"
                    className="w-full px-6 py-4 bg-card-alt rounded-full border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-6 py-4 bg-card-alt rounded-full border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                  />
                </div>

                <button
                  onClick={handleResearch}
                  disabled={loading || !listingInput.trim()}
                  className="w-full px-8 py-4 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Researching (this may take a minute)...
                    </>
                  ) : (
                    'Start Research'
                  )}
                </button>

                {error && (
                  <div className="bg-accent/10 rounded-2xl p-4 border border-accent/20">
                    <p className="text-accent text-sm">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Research Results */}
          {research && (
            <div className="space-y-8">
              {/* Summary */}
              <div className="bg-card rounded-3xl p-8 shadow-soft border border-border">
                <div className="flex items-start gap-4">
                  <Shield size={32} className="text-primary flex-shrink-0" strokeWidth={1.5} />
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-foreground mb-3">
                      Research Summary
                    </h2>
                    <p className="text-foreground/80 leading-relaxed whitespace-pre-line">
                      {research.summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Landlord Reviews */}
              {research.landlordReviews && research.landlordReviews.length > 0 && (
                <div className="bg-card rounded-3xl p-8 shadow-soft border border-border">
                  <h3 className="text-xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
                    <Star size={20} strokeWidth={1.5} />
                    Landlord Reviews ({research.landlordReviews.length})
                  </h3>
                  <div className="space-y-4">
                    {research.landlordReviews.map((review, index) => (
                      <div key={index} className="p-4 bg-card-alt rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground/60">
                            {review.source}
                          </span>
                          {review.rating && (
                            <span className={`font-semibold ${getRatingColor(review.rating)}`}>
                              {review.rating}/5 ★
                            </span>
                          )}
                        </div>
                        <p className="text-foreground/80">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Building Violations */}
              {research.violations && research.violations.length > 0 && (
                <div className="bg-red-50 rounded-3xl p-8 border border-red-200">
                  <h3 className="text-xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-red-600" strokeWidth={1.5} />
                    Building Violations ({research.violations.length})
                  </h3>
                  <div className="space-y-3">
                    {research.violations.map((violation, index) => (
                      <div key={index} className="p-4 bg-white rounded-2xl border border-red-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">{violation.type}</span>
                          {violation.status && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              violation.status.toLowerCase() === 'resolved' 
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {violation.status}
                            </span>
                          )}
                        </div>
                        <p className="text-foreground/70 text-sm">{violation.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Violations Found */}
              {(!research.violations || research.violations.length === 0) && (
                <div className="bg-green-50 rounded-3xl p-8 border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={24} className="text-green-600" strokeWidth={1.5} />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">No Violations Found</h3>
                      <p className="text-foreground/70 text-sm">
                        No building violations were found in our search.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Neighborhood Info */}
              {research.neighborhood && (
                <div className="bg-card rounded-3xl p-8 shadow-soft border border-border">
                  <h3 className="text-xl font-serif font-bold text-foreground mb-6 flex items-center gap-2">
                    <MapPin size={20} strokeWidth={1.5} />
                    Neighborhood Guide
                  </h3>
                  
                  {/* Vibe & Demographics */}
                  {(research.neighborhood.vibe || research.neighborhood.demographics) && (
                    <div className="mb-6 p-4 bg-primary/5 rounded-2xl">
                      {research.neighborhood.vibe && (
                        <p className="text-foreground/80 mb-2">{research.neighborhood.vibe}</p>
                      )}
                      {research.neighborhood.demographics && (
                        <p className="text-foreground/60 text-sm flex items-center gap-2">
                          <Users size={14} />
                          {research.neighborhood.demographics}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Scores Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {research.neighborhood.crimeLevel && (
                      <div className="p-4 bg-card-alt rounded-2xl text-center">
                        <p className="text-sm text-foreground/60 mb-1">Safety</p>
                        <p className={`font-semibold ${
                          research.neighborhood.crimeLevel === 'low' ? 'text-green-600' :
                          research.neighborhood.crimeLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {research.neighborhood.crimeLevel.charAt(0).toUpperCase() + 
                           research.neighborhood.crimeLevel.slice(1)} Crime
                        </p>
                      </div>
                    )}
                    {research.neighborhood.walkScore && (
                      <div className="p-4 bg-card-alt rounded-2xl text-center">
                        <p className="text-sm text-foreground/60 mb-1">Walk Score</p>
                        <p className="font-semibold text-foreground">{research.neighborhood.walkScore}</p>
                      </div>
                    )}
                    {research.neighborhood.transitScore && (
                      <div className="p-4 bg-card-alt rounded-2xl text-center">
                        <p className="text-sm text-foreground/60 mb-1">Transit Score</p>
                        <p className="font-semibold text-foreground">{research.neighborhood.transitScore}</p>
                      </div>
                    )}
                    {research.neighborhood.bikeScore && (
                      <div className="p-4 bg-card-alt rounded-2xl text-center">
                        <p className="text-sm text-foreground/60 mb-1">Bike Score</p>
                        <p className="font-semibold text-foreground flex items-center justify-center gap-1">
                          <Bike size={14} /> {research.neighborhood.bikeScore}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Crime Details */}
                  {research.neighborhood.crimeDetails && (
                    <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                      <p className="text-sm font-medium text-amber-800 mb-1 flex items-center gap-2">
                        <AlertTriangle size={14} /> Safety Details
                      </p>
                      <p className="text-amber-700 text-sm">{research.neighborhood.crimeDetails}</p>
                    </div>
                  )}

                  {/* Culture & Dining */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {research.neighborhood.dining && research.neighborhood.dining.length > 0 && (
                      <div className="p-4 bg-card-alt rounded-2xl">
                        <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                          <Utensils size={14} className="text-primary" /> Dining
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {research.neighborhood.dining.map((item, i) => (
                            <span key={i} className="px-2 py-1 bg-white rounded-full text-xs text-foreground/70">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {research.neighborhood.culture && research.neighborhood.culture.length > 0 && (
                      <div className="p-4 bg-card-alt rounded-2xl">
                        <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                          <Star size={14} className="text-primary" /> Culture
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {research.neighborhood.culture.map((item, i) => (
                            <span key={i} className="px-2 py-1 bg-white rounded-full text-xs text-foreground/70">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nightlife */}
                  {research.neighborhood.nightlife && (
                    <div className="mb-4 p-4 bg-card-alt rounded-2xl">
                      <p className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                        <Music size={14} className="text-primary" /> Nightlife
                      </p>
                      <p className="text-foreground/70 text-sm">{research.neighborhood.nightlife}</p>
                    </div>
                  )}

                  {/* Parks & Grocery */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {research.neighborhood.parks && research.neighborhood.parks.length > 0 && (
                      <div className="p-4 bg-green-50 rounded-2xl">
                        <p className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
                          <Trees size={14} /> Parks & Green Space
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {research.neighborhood.parks.map((item, i) => (
                            <span key={i} className="px-2 py-1 bg-white rounded-full text-xs text-green-700">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {research.neighborhood.groceryStores && research.neighborhood.groceryStores.length > 0 && (
                      <div className="p-4 bg-card-alt rounded-2xl">
                        <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                          <ShoppingBag size={14} className="text-primary" /> Grocery
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {research.neighborhood.groceryStores.map((item, i) => (
                            <span key={i} className="px-2 py-1 bg-white rounded-full text-xs text-foreground/70">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Other Amenities */}
                  {research.neighborhood.nearbyAmenities && research.neighborhood.nearbyAmenities.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-foreground/60 mb-2">Other Nearby</p>
                      <div className="flex flex-wrap gap-2">
                        {research.neighborhood.nearbyAmenities.map((amenity, index) => (
                          <span key={index} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tips */}
              {research.tips && research.tips.length > 0 && (
                <div className="bg-card rounded-3xl p-8 shadow-soft border border-border">
                  <h3 className="text-xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
                    <Lightbulb size={20} strokeWidth={1.5} />
                    Tips for This Rental
                  </h3>
                  <ul className="space-y-3">
                    {research.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle size={18} className="text-primary flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <span className="text-foreground/80">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resource Links */}
              {research.resourceLinks && research.resourceLinks.length > 0 && (
                <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10">
                  <h3 className="text-xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
                    <ExternalLink size={20} strokeWidth={1.5} />
                    Verify This Building
                  </h3>
                  <p className="text-foreground/60 text-sm mb-4">
                    Use these official resources to check building history, violations, and ownership:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {research.resourceLinks.map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-white rounded-xl border border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <ExternalLink size={16} className="text-primary" strokeWidth={1.5} />
                        <span className="text-foreground font-medium">{link.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Confirmation */}
              {email && (
                <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 text-center">
                  <Mail size={24} className="text-primary mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-foreground/70">
                    Report sent to <span className="font-semibold text-foreground">{email}</span>
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setResearch(null)
                  setEmail('')
                  setListingInput('')
                }}
                className="w-full px-8 py-4 bg-transparent text-primary border border-primary rounded-full text-sm tracking-widest uppercase hover:bg-primary hover:text-background transition-all duration-300"
              >
                Research Another Listing
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  )
}
