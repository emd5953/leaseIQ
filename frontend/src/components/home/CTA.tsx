import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function CTA() {
  return (
    <section className="py-24 md:py-32 px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="relative bg-primary/5 rounded-[40px] p-12 md:p-16 text-center overflow-hidden border border-primary/10">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl md:text-6xl font-serif font-bold text-foreground text-balance">
              Ready to find your <span className="italic">perfect</span> place?
            </h2>
            <p className="text-lg md:text-xl text-foreground/70 leading-relaxed max-w-2xl mx-auto">
              Join thousands of renters who've found their dream apartments with LeaseIQ.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/search"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300"
              >
                Start Searching Free
                <ArrowRight size={18} strokeWidth={1.5} className="group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-primary border border-primary rounded-full text-sm tracking-widest uppercase hover:bg-primary hover:text-background transition-all duration-300"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
