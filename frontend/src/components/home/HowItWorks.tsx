import { Database, Cpu, FileSearch, Zap, ArrowRight } from 'lucide-react'

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Search & Discover',
      description: 'Browse thousands of listings from all major platforms. Filter by price, location, amenities, and more.',
      image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80',
      tech: 'Powered by Firecrawl API for real-time data extraction from 15 rental platforms',
    },
    {
      number: '02',
      title: 'Research & Verify',
      description: 'Click any listing to see landlord reviews, building violations, and neighborhood insights. Make informed decisions.',
      image: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=600&q=80',
      tech: 'Firecrawl scrapes landlord reviews, violations & neighborhood data in real-time',
    },
    {
      number: '03',
      title: 'Analyze & Sign',
      description: 'Upload your lease for AI analysis. We highlight red flags and explain complex terms so you sign with confidence.',
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80',
      tech: 'Reducto API for PDF parsing + OpenRouter (GPT-4) for intelligent clause analysis',
    },
  ]

  const techStack = [
    { icon: Database, label: 'Firecrawl', desc: 'Web scraping & extraction' },
    { icon: FileSearch, label: 'Reducto', desc: 'PDF document parsing' },
    { icon: Cpu, label: 'OpenRouter', desc: 'AI gateway (GPT-4)' },
    { icon: Zap, label: 'Resend', desc: 'Email notifications' },
  ]

  return (
    <section className="py-24 md:py-32 px-6 lg:px-8 bg-card-alt">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <h2 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6 text-balance">
            How <span className="italic">LeaseI</span>Q works
          </h2>
          <p className="text-lg md:text-xl text-foreground/70 leading-relaxed">
            Three simple steps to finding and securing your perfect apartment.
          </p>
        </div>

        {/* Technology Stack Overview */}
        <div className="mb-16 md:mb-24">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-[40px] p-10 md:p-14 border border-primary/20 shadow-soft-lg">
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-10 text-center">
              Technology Powering <span className="italic">LeaseI</span>Q
            </h3>
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

        {/* Workflow Diagram */}
        <div className="mb-16 md:mb-24">
          <div className="bg-gradient-to-r from-primary/10 via-primary/15 to-primary/10 rounded-[40px] p-10 md:p-14 border border-primary/30 shadow-soft-lg">
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-10 text-center">
              Data Pipeline Workflow
            </h3>
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
                <div className="flex items-center gap-3 text-base font-semibold bg-primary text-background px-5 py-3 rounded-full w-fit shadow-soft">
                  <Cpu size={20} strokeWidth={1.5} />
                  <span>{step.tech}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
