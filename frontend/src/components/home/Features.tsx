import { Search, Shield, FileText, Bell } from 'lucide-react'

export default function Features() {
  const features = [
    {
      icon: Search,
      title: 'Unified Search',
      description: 'Search across 15 platforms: Zillow, StreetEasy, Apartments.com, Trulia, Realtor.com, Craigslist, Facebook, Zumper, HotPads, RentHop, PadMapper, Rent.com, Rentals.com, ApartmentList, and ApartmentGuide—all in one place.',
    },
    {
      icon: Bell,
      title: 'Instant Alerts',
      description: 'Set your preferences and get notified the moment a matching listing appears. Be first in line, every time.',
    },
    {
      icon: Shield,
      title: 'Deep Research',
      description: 'Uncover landlord reviews, building violations, and complaint history before you tour. Know what you\'re getting into.',
    },
    {
      icon: FileText,
      title: 'Lease Analysis',
      description: 'Upload your lease and get AI-powered analysis highlighting red flags, unfair clauses, and key terms in plain English.',
    },
  ]

  return (
    <section className="py-24 md:py-32 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <h2 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6 text-balance">
            Everything you need to find <span className="italic">the one</span>
          </h2>
          <p className="text-lg md:text-xl text-foreground/70 leading-relaxed">
            From search to signature, we've got you covered at every step of your apartment hunt.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group bg-card rounded-3xl p-8 md:p-10 shadow-soft hover:shadow-soft-lg hover:-translate-y-2 transition-all duration-500 border border-border ${
                index % 2 === 1 ? 'md:translate-y-12' : ''
              }`}
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-500">
                <feature.icon size={24} className="text-primary" strokeWidth={1.5} />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-serif font-semibold text-foreground mb-4">
                {feature.title}
              </h3>
              <p className="text-foreground/70 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
