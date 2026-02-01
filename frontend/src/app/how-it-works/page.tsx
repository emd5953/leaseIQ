import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Search, Shield, FileText, Bell, Zap, Users, Database, Cpu, FileSearch, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function HowItWorksPage() {
  const features = [
    {
      icon: Search,
      title: 'Unified Search',
      description: 'We aggregate listings from 15 platforms: Zillow, StreetEasy, Apartments.com, Trulia, Realtor.com, Craigslist, Facebook, Zumper, HotPads, RentHop, PadMapper, Rent.com, Rentals.com, ApartmentList, and ApartmentGuide.',
      benefits: ['Real-time updates', 'No duplicate listings', 'Advanced filters'],
      tech: 'Powered by Firecrawl API',
    },
    {
      icon: Bell,
      title: 'Smart Alerts',
      description: 'Set your preferences and get instant notifications when matching listings appear. Be first in line.',
      benefits: ['Email notifications', 'Custom criteria', 'Instant delivery'],
      tech: 'Powered by Resend Email API',
    },
    {
      icon: Shield,
      title: 'Deep Research',
      description: 'Click any listing to see landlord reviews, building violations, and complaint history before you tour.',
      benefits: ['Landlord reviews', 'Building violations', 'Neighborhood insights'],
      tech: 'Powered by Firecrawl API',
    },
    {
      icon: FileText,
      title: 'Lease Analysis',
      description: 'Upload your lease for AI-powered analysis. We highlight red flags and explain complex terms in plain English.',
      benefits: ['Red flag detection', 'Plain English explanations', 'Expert recommendations'],
      tech: 'Powered by Reducto + OpenRouter (GPT-4)',
    },
  ]

  const process = [
    {
      step: '01',
      title: 'Create Your Profile',
      description: 'Tell us what you\'re looking for: budget, location, bedrooms, amenities, and more.',
      tech: 'MongoDB stores your preferences securely',
    },
    {
      step: '02',
      title: 'Get Instant Alerts',
      description: 'We monitor all listing sources 24/7 and notify you the moment a match appears.',
      tech: 'Firecrawl scrapes 15 sources in real-time',
    },
    {
      step: '03',
      title: 'Research & Verify',
      description: 'Click any listing to see comprehensive research: landlord reviews, violations, and more.',
      tech: 'Firecrawl scrapes reviews & violations',
    },
    {
      step: '04',
      title: 'Analyze Your Lease',
      description: 'Before signing, upload your lease for AI analysis to catch red flags and unfair terms.',
      tech: 'Reducto PDF parsing + OpenRouter AI analysis',
    },
  ]

  const techStack = [
    { icon: Database, label: 'Firecrawl', desc: 'Web scraping & extraction' },
    { icon: FileSearch, label: 'Reducto', desc: 'PDF document parsing' },
    { icon: Cpu, label: 'OpenRouter', desc: 'AI gateway (GPT-4)' },
    { icon: Zap, label: 'Resend', desc: 'Email notifications' },
  ]

  return (
    <main className="min-h-screen">
      <Navigation />
      
      {/* Hero */}
      <section className="pt-32 pb-16 md:pb-24 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground mb-6 text-balance">
            How <span className="italic">LeaseI</span>Q works
          </h1>
          <p className="text-xl text-foreground/70 leading-relaxed">
            From search to signature, we've built the complete apartment hunting platform you've been waiting for.
          </p>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-12 md:py-16 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-[40px] p-10 md:p-14 border border-primary/20 shadow-soft-lg">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-10 text-center">
              Technology Powering <span className="italic">LeaseI</span>Q
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
              {techStack.map((tech, index) => (
                <div key={index} className="flex flex-col items-center text-center p-6 bg-card rounded-2xl shadow-soft border border-border">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                    <tech.icon size={28} className="text-primary" strokeWidth={1.5} />
                  </div>
                  <p className="font-bold text-foreground text-lg">{tech.label}</p>
                  <p className="text-foreground/60 text-sm mt-1">{tech.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Data Pipeline */}
      <section className="py-12 md:py-16 px-6 lg:px-8 bg-card-alt">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-primary/10 via-primary/15 to-primary/10 rounded-[40px] p-10 md:p-14 border border-primary/30 shadow-soft-lg">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-10 text-center">
              Data Pipeline Workflow
            </h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-3">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl shadow-soft min-w-[160px] border border-border">
                <div className="w-14 h-14 rounded-full bg-primary text-background flex items-center justify-center mb-4">
                  <span className="font-bold text-lg">1</span>
                </div>
                <p className="font-bold text-foreground text-lg">15 Sources</p>
                <p className="text-foreground/60 text-sm">Rental platforms</p>
              </div>
              
              <ArrowRight size={28} className="text-primary rotate-90 md:rotate-0" />
              
              {/* Step 2 */}
              <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl shadow-soft min-w-[160px] border border-border">
                <div className="w-14 h-14 rounded-full bg-primary text-background flex items-center justify-center mb-4">
                  <span className="font-bold text-lg">2</span>
                </div>
                <p className="font-bold text-foreground text-lg">Firecrawl</p>
                <p className="text-foreground/60 text-sm">Extract & normalize</p>
              </div>
              
              <ArrowRight size={28} className="text-primary rotate-90 md:rotate-0" />
              
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl shadow-soft min-w-[160px] border border-border">
                <div className="w-14 h-14 rounded-full bg-primary text-background flex items-center justify-center mb-4">
                  <span className="font-bold text-lg">3</span>
                </div>
                <p className="font-bold text-foreground text-lg">MongoDB</p>
                <p className="text-foreground/60 text-sm">Store & dedupe</p>
              </div>
              
              <ArrowRight size={28} className="text-primary rotate-90 md:rotate-0" />
              
              {/* Step 4 */}
              <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl shadow-soft min-w-[160px] border border-border">
                <div className="w-14 h-14 rounded-full bg-primary text-background flex items-center justify-center mb-4">
                  <span className="font-bold text-lg">4</span>
                </div>
                <p className="font-bold text-foreground text-lg">OpenRouter</p>
                <p className="text-foreground/60 text-sm">AI analysis (GPT-4)</p>
              </div>
              
              <ArrowRight size={28} className="text-primary rotate-90 md:rotate-0" />
              
              {/* Step 5 */}
              <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl shadow-soft min-w-[160px] border border-border">
                <div className="w-14 h-14 rounded-full bg-primary text-background flex items-center justify-center mb-4">
                  <span className="font-bold text-lg">5</span>
                </div>
                <p className="font-bold text-foreground text-lg">Resend</p>
                <p className="text-foreground/60 text-sm">Email alerts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-12 text-center">
            Core <span className="italic">Features</span>
          </h2>
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
                <ul className="space-y-2 mb-5">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground/70">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {benefit}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary bg-primary/10 px-4 py-2.5 rounded-full w-fit">
                  <Cpu size={16} strokeWidth={1.5} />
                  <span>{feature.tech}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 md:py-24 px-6 lg:px-8 bg-card-alt">
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
                <div className="flex-1">
                  <h3 className="text-2xl font-serif font-bold text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-foreground/70 leading-relaxed mb-3">{item.description}</p>
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary bg-primary/10 px-4 py-2.5 rounded-full w-fit">
                    <Cpu size={16} strokeWidth={1.5} />
                    <span>{item.tech}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Different */}
      <section className="py-16 md:py-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-12 text-center">
            Why we're <span className="italic">different</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-card rounded-3xl shadow-soft border border-border">
              <Zap size={40} className="text-primary mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-serif font-bold text-foreground mb-3">
                Speed
              </h3>
              <p className="text-foreground/70 leading-relaxed">
                Real-time scraping and instant alerts mean you see listings before anyone else.
              </p>
            </div>
            <div className="text-center p-8 bg-card rounded-3xl shadow-soft border border-border">
              <Shield size={40} className="text-primary mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-serif font-bold text-foreground mb-3">
                Intelligence
              </h3>
              <p className="text-foreground/70 leading-relaxed">
                AI-powered research and analysis help you make informed decisions with confidence.
              </p>
            </div>
            <div className="text-center p-8 bg-card rounded-3xl shadow-soft border border-border">
              <Users size={40} className="text-primary mx-auto mb-4" strokeWidth={1.5} />
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
      <section className="py-16 md:py-24 px-6 lg:px-8 bg-card-alt">
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
