import Link from 'next/link'
import { Search, ArrowRight } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative pt-32 pb-16 md:pt-40 md:pb-32 px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text Content */}
          <div className="space-y-8">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold text-foreground leading-[1.1] text-balance">
              Find your <span className="italic">perfect</span> apartment
            </h1>
            
            <p className="text-lg md:text-xl text-foreground/70 leading-relaxed max-w-xl">
              Search all listings. Research landlords. Analyze leases. 
              Everything you need to find and secure your next home—all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/search"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300"
              >
                <Search size={18} strokeWidth={1.5} />
                Start Searching
                <ArrowRight size={18} strokeWidth={1.5} className="group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              
              <Link
                href="/how-it-works"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-primary border border-primary rounded-full text-sm tracking-widest uppercase hover:bg-primary hover:text-background transition-all duration-300"
              >
                How It Works
              </Link>
            </div>
          </div>

          {/* Right: Hero Image with Quote Card */}
          <div className="relative">
            {/* Main Image */}
            <div className="relative aspect-[3/4] md:aspect-square md:h-[600px] rounded-[40px] overflow-hidden shadow-soft-xl">
              <img
                src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80"
                alt="Modern apartment interior"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>

            {/* Floating Quote Card */}
            <div className="absolute -bottom-8 -left-4 md:-left-8 right-4 md:right-auto md:w-80 bg-card/90 backdrop-blur-sm rounded-3xl p-6 shadow-soft-lg border border-border">
              <p className="text-foreground/80 italic leading-relaxed">
                "Finally found my dream apartment in Brooklyn. LeaseIQ helped me research the building and catch red flags in the lease before signing."
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Sarah Chen</p>
                  <p className="text-foreground/60 text-xs">Williamsburg, Brooklyn</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
