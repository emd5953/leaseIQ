'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { FileText, Upload, AlertTriangle, CheckCircle, Mail } from 'lucide-react'

export default function LeaseAnalyzerPage() {
  const [leaseText, setLeaseText] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!leaseText.trim()) {
      setError('Please paste your lease text')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/lease/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leaseText,
          email: email || undefined 
        }),
      })

      if (!response.ok) throw new Error('Analysis failed')
      
      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze lease')
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
              Analyze your <span className="italic">lease</span>
            </h1>
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
              Upload your lease and get AI-powered analysis highlighting red flags, unfair clauses, and key terms in plain English.
            </p>
          </div>

          {/* Analyzer Form */}
          {!analysis && (
            <div className="bg-card rounded-3xl p-8 md:p-12 shadow-soft border border-border">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Lease Text
                  </label>
                  <textarea
                    value={leaseText}
                    onChange={(e) => setLeaseText(e.target.value)}
                    placeholder="Paste your lease text here..."
                    rows={12}
                    className="w-full px-6 py-4 bg-card-alt rounded-3xl border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 resize-none"
                  />
                  <p className="text-sm text-foreground/60 mt-2">
                    Copy and paste the text from your lease document
                  </p>
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
                  <p className="text-sm text-foreground/60 mt-2">
                    We'll send the analysis report to your email
                  </p>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={loading || !leaseText.trim()}
                  className="w-full px-8 py-4 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FileText size={18} strokeWidth={1.5} />
                  {loading ? 'Analyzing...' : 'Analyze Lease'}
                </button>

                {error && (
                  <div className="bg-accent/10 rounded-2xl p-4 border border-accent/20">
                    <p className="text-accent text-sm">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-8">
              {/* Summary */}
              <div className="bg-card rounded-3xl p-8 shadow-soft border border-border">
                <div className="flex items-start gap-4 mb-6">
                  <FileText size={32} className="text-primary flex-shrink-0" strokeWidth={1.5} />
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
                      Analysis Summary
                    </h2>
                    <p className="text-foreground/70 leading-relaxed">
                      {analysis.summary || 'Your lease has been analyzed'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Red Flags */}
              {analysis.redFlags && analysis.redFlags.length > 0 && (
                <div className="bg-accent/5 rounded-3xl p-8 border border-accent/20">
                  <div className="flex items-start gap-4 mb-6">
                    <AlertTriangle size={24} className="text-accent flex-shrink-0 mt-1" strokeWidth={1.5} />
                    <div className="flex-1">
                      <h3 className="text-xl font-serif font-bold text-foreground mb-4">
                        Red Flags ({analysis.redFlags.length})
                      </h3>
                      <div className="space-y-4">
                        {analysis.redFlags.map((flag: any, index: number) => (
                          <div key={index} className="p-4 bg-card rounded-2xl">
                            <h4 className="font-semibold text-foreground mb-2">{flag.title}</h4>
                            <p className="text-foreground/70 text-sm">{flag.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Key Terms */}
              {analysis.keyTerms && analysis.keyTerms.length > 0 && (
                <div className="bg-card rounded-3xl p-8 shadow-soft border border-border">
                  <h3 className="text-xl font-serif font-bold text-foreground mb-4">
                    Key Terms
                  </h3>
                  <div className="space-y-4">
                    {analysis.keyTerms.map((term: any, index: number) => (
                      <div key={index} className="p-4 bg-card-alt rounded-2xl">
                        <div className="flex items-start gap-2 mb-2">
                          <CheckCircle size={18} className="text-primary flex-shrink-0 mt-1" strokeWidth={1.5} />
                          <h4 className="font-semibold text-foreground">{term.term}</h4>
                        </div>
                        <p className="text-foreground/70 text-sm ml-6">{term.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations && (
                <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10">
                  <h3 className="text-xl font-serif font-bold text-foreground mb-4">
                    Recommendations
                  </h3>
                  <p className="text-foreground/70 leading-relaxed whitespace-pre-line">
                    {analysis.recommendations}
                  </p>
                </div>
              )}

              {/* Email Confirmation */}
              {email && (
                <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 text-center">
                  <Mail size={24} className="text-primary mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-foreground/70">
                    Analysis report sent to <span className="font-semibold text-foreground">{email}</span>
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setAnalysis(null)
                  setLeaseText('')
                  setEmail('')
                }}
                className="w-full px-8 py-4 bg-transparent text-primary border border-primary rounded-full text-sm tracking-widest uppercase hover:bg-primary hover:text-background transition-all duration-300"
              >
                Analyze Another Lease
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  )
}
