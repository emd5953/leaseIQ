export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Search & Discover',
      description: 'Browse thousands of listings from all major platforms. Filter by price, location, amenities, and more.',
      image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80',
    },
    {
      number: '02',
      title: 'Research & Verify',
      description: 'Click any listing to see landlord reviews, building violations, and neighborhood insights. Make informed decisions.',
      image: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=600&q=80',
    },
    {
      number: '03',
      title: 'Analyze & Sign',
      description: 'Upload your lease for AI analysis. We highlight red flags and explain complex terms so you sign with confidence.',
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80',
    },
  ]

  return (
    <section className="py-24 md:py-32 px-6 lg:px-8 bg-card-alt">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <h2 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6 text-balance">
            How <span className="italic">LeaseIQ</span> works
          </h2>
          <p className="text-lg md:text-xl text-foreground/70 leading-relaxed">
            Three simple steps to finding and securing your perfect apartment.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-16 md:space-y-24">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              {/* Image */}
              <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="relative aspect-[4/3] rounded-[40px] overflow-hidden shadow-soft-lg">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>

              {/* Content */}
              <div className={`space-y-6 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                <div className="inline-block px-4 py-2 bg-primary/10 rounded-full">
                  <span className="text-sm font-semibold text-primary tracking-widest">
                    STEP {step.number}
                  </span>
                </div>
                <h3 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
                  {step.title}
                </h3>
                <p className="text-lg text-foreground/70 leading-relaxed max-w-xl">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
