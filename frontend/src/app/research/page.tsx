'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Shield, AlertTriangle, CheckCircle, Mail } from 'lucide-react'

export default function ResearchPage() {
  const searchParams = useSearchParams()
  const listingId = searchParams.get('listingId')
  
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [research, setResearch] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleResearch = async () => {
    if (!listingId) {
      setError('No listing selected')
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
              Get landlord reviews, building violations, and neighborhood insights to make an informed decision.
            </p>
          </div>

          {/* Research Form */}
          {!research && (
            <div className="bg-card rounded-3xl p-8 md:p-12 shadow-soft border border-border">
              <div className="space-y-6">
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
                  <p className="text-sm text-foreground/60 mt-2">
                    We'll send the research report to your email
                  </p>
                </div>

                <button
                  onClick={handleResearch}
                  disabled={loading || !listingId}
                  className="w-full px-8 py-4 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Researching...' : 'Start Research'}
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
                <div className="flex items-start gap-4 mb-6">
                  <Shield size={32} className="text-primary flex-shrink-0" strokeWidth={1.5} />
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
                      Research Summary
                    </h2>
                    <p className="text-foreground/70 leading-relaxed">
                      {research.summary || 'Research completed successfully'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Landlord Reviews */}
              {research.landlordReviews && (
                <div className="bg-card rounded-3xl p-8 shadow-soft border border-border">
                  <h3 className="text-xl font-serif font-bold text-foreground mb-4">
                    Landlord Reviews
                  </h3>
                  <div className="space-y-4">
                    {research.landlordReviews.map((review: any, index: number) => (
                      <div key={index} className="p-4 bg-card-alt rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          {review.rating >= 4 ? (
                            <CheckCircle size={18} className="text-primary" strokeWidth={1.5} />
                          ) : (
                            <AlertTriangle size={18} className="text-accent" strokeWidth={1.5} />
                          )}
                          <span className="font-semibold text-foreground">
                            {review.rating}/5 stars
                          </span>
                        </div>
                        <p className="text-foreground/70 text-sm">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Building Violations */}
              {research.violations && research.violations.length > 0 && (
                <div className="bg-accent/5 rounded-3xl p-8 border border-accent/20">
                  <div className="flex items-start gap-4">
                    <AlertTriangle size={24} className="text-accent flex-shrink-0 mt-1" strokeWidth={1.5} />
                    <div>
                      <h3 className="text-xl font-serif font-bold text-foreground mb-4">
                        Building Violations
                      </h3>
                      <ul className="space-y-2">
                        {research.violations.map((violation: string, index: number) => (
                          <li key={index} className="text-foreground/70">• {violation}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Confirmation */}
              {email && (
                <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 text-center">
                  <Mail size={24} className="text-primary mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-foreground/70">
                    Research report sent to <span className="font-semibold text-foreground">{email}</span>
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setResearch(null)
                  setEmail('')
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
