import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Search, Shield, FileText, Bell, Zap, Users } from 'lucide-react'
import Link from 'next/link'

export default function HowItWorksPage() {
  const features = [
    {
      icon: Search,
      title: 'Unified Search',
      description: 'We aggregate listings from StreetEasy, Zillow, Apartments.com, Craigslist, and Facebook. Search once, see everything.',
      benefits: ['Real-time updates', 'No duplicate listings', 'Advanced filters'],
    },
    {
      icon: Bell,
      title: 'Smart Alerts',
      description: 'Set your preferences and get instant notifications when matching listings appear. Be first in line.',
      benefits: ['Email notifications', 'Custom criteria', 'Instant delivery'],
    },
    {
      icon: Shield,
      title: 'Deep Research',
      description: 'Click any listing to see landlord reviews, building violations, and complaint history before you tour.',
      benefits: ['Landlord reviews', 'Building violations', 'Neighborhood insights'],
    },
    {
      icon: FileText,
      title: 'Lease Analysis',
      description: 'Upload your lease for AI-powered analysis. We highlight red flags and explain complex terms in plain English.',
      benefits: ['Red flag detection', 'Plain English explanations', 'Expert recommendations'],
    },
  ]

  const process = [
    {
      step: '01',
      title: 'Create Your Profile',
      description: 'Tell us what you\'re looking for: budget, location, bedrooms, amenities, and more.',
    },
    {
      step: '02',
      title: 'Get Instant Alerts',
      description: 'We monitor all listing sources 24/7 and notify you the moment a match appears.',
    },
    {
      step: '03',
      title: 'Research & Verify',
      description: 'Click any listing to see comprehensive research: landlord reviews, violations, and more.',
    },
    {
      step: '04',
      title: 'Analyze Your Lease',
      description: 'Before signing, upload your lease for AI analysis to catch red flags and unfair terms.',
    },
  ]

  return (
    <main className="min-h-screen">
      <Navigation />
      
      {/* Hero */}
      <section className="pt-32 pb-16 md:pb-24 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground mb-6 text-balance">
            How <span className="italic">LeaseIQ</span> works
          </h1>
          <p className="text-xl text-foreground/70 leading-relaxed">
            From search to signature, we've built the complete apartment hunting platform you've been waiting for.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 px-6 lg:px-8 bg-card-alt">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`bg-card rounded-3xl p-8 shadow-soft border border-border ${
                  index % 2 === 1 ? 'md:translate-y-12' : ''
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <feature.icon size={24} className="text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-foreground/70 leading-relaxed mb-4">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground/70">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 md:py-24 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-12 text-center">
            Your journey to the <span className="italic">perfect</span> apartment
          </h2>
          <div className="space-y-8">
            {process.map((item, index) => (
              <div
                key={index}
                className="flex gap-6 items-start p-8 bg-card rounded-3xl shadow-soft border border-border"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-serif font-bold text-primary">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-bold text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-foreground/70 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Different */}
      <section className="py-16 md:py-24 px-6 lg:px-8 bg-card-alt">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-12 text-center">
            Why we're <span className="italic">different</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Zap size={32} className="text-primary mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-serif font-bold text-foreground mb-3">
                Speed
              </h3>
              <p className="text-foreground/70 leading-relaxed">
                Real-time scraping and instant alerts mean you see listings before anyone else.
              </p>
            </div>
            <div className="text-center">
              <Shield size={32} className="text-primary mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-serif font-bold text-foreground mb-3">
                Intelligence
              </h3>
              <p className="text-foreground/70 leading-relaxed">
                AI-powered research and analysis help you make informed decisions with confidence.
              </p>
            </div>
            <div className="text-center">
              <Users size={32} className="text-primary mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-serif font-bold text-foreground mb-3">
                Complete
              </h3>
              <p className="text-foreground/70 leading-relaxed">
                From search to signature, everything you need is in one place. No more juggling tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-foreground/70 mb-8">
            Join thousands of renters finding their perfect apartments with LeaseIQ.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300"
            >
              Start Searching
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-primary border border-primary rounded-full text-sm tracking-widest uppercase hover:bg-primary hover:text-background transition-all duration-300"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
