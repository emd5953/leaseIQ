import Link from 'next/link'
import { ArrowRight, Bell, ClipboardList, FileText, Home as HomeIcon, Search, ShieldCheck } from 'lucide-react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

const steps = [
  { icon: Search, number: '01', title: 'Find it', description: 'Search NYC rentals from StreetEasy in one calm, focused workspace.' },
  { icon: ClipboardList, number: '02', title: 'Keep track', description: 'Save the places you care about and keep every next step together.' },
  { icon: ShieldCheck, number: '03', title: 'Know what you’re signing', description: 'Review the building, landlord, and lease before you commit.' },
]

const tools = [
  { icon: Search, title: 'StreetEasy search', copy: 'A focused NYC apartment search without the tab overload.' },
  { icon: Bell, title: 'Your shortlist', copy: 'Save listings, set alerts, and keep the places you like in one view.' },
  { icon: HomeIcon, title: 'Building & landlord checks', copy: 'Put the practical details beside the apartment, where they belong.' },
  { icon: FileText, title: 'Lease review', copy: 'Understand the important terms before you put your name on them.' },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <section className="px-6 pb-24 pt-36 lg:px-8 lg:pb-32 lg:pt-48">
        <div className="mx-auto grid max-w-7xl items-end gap-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-7 text-xs font-semibold uppercase tracking-[0.22em] text-primary">New York City apartment hunting</p>
            <h1 className="max-w-4xl text-5xl font-serif font-semibold leading-[0.98] tracking-[-0.03em] text-foreground md:text-7xl lg:text-8xl">
              Find your apartment. <span className="italic">Make it home.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-foreground/65 md:text-xl">
              Your all-in-one place for finding an apartment on StreetEasy, keeping track of the ones you like, and getting the details you need before you move in.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/search" className="pressable inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-7 py-4 text-sm font-semibold text-background transition-opacity duration-200 hover:opacity-90">
                Start your search <ArrowRight size={17} />
              </Link>
              <Link href="/how-it-works" className="pressable inline-flex items-center justify-center rounded-full border border-border bg-card px-7 py-4 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-card-alt">
                See how it works
              </Link>
            </div>
          </div>

          <div className="border-l border-border pl-8 lg:mb-2">
            <p className="max-w-sm text-2xl font-serif leading-snug text-foreground">The search, the shortlist, the fine print — together in one place.</p>
            <div className="mt-10 grid max-w-sm grid-cols-2 gap-x-8 gap-y-6 border-t border-border pt-6 text-sm">
              <div><p className="font-semibold text-foreground">StreetEasy</p><p className="mt-1 text-foreground/55">NYC listings</p></div>
              <div><p className="font-semibold text-foreground">One workspace</p><p className="mt-1 text-foreground/55">Search to move-in</p></div>
              <div><p className="font-semibold text-foreground">Less guesswork</p><p className="mt-1 text-foreground/55">More useful context</p></div>
              <div><p className="font-semibold text-foreground">Built for renters</p><p className="mt-1 text-foreground/55">Not listing brokers</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card-alt px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">A simpler way through it</p>
            <h2 className="mt-5 text-4xl font-serif font-semibold leading-tight text-foreground md:text-5xl">From the first search to the first night in your new home.</h2>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="bg-card p-8 md:p-10">
                <div className="flex items-center justify-between"><step.icon size={23} className="text-primary" strokeWidth={1.6} /><span className="text-xs font-semibold tracking-[0.2em] text-foreground/35">{step.number}</span></div>
                <h3 className="mt-16 text-2xl font-serif font-semibold text-foreground">{step.title}</h3>
                <p className="mt-3 max-w-xs leading-relaxed text-foreground/60">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-xl"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Everything in context</p><h2 className="mt-5 text-4xl font-serif font-semibold leading-tight text-foreground md:text-5xl">The details that help you decide.</h2></div>
            <p className="max-w-sm text-foreground/60 md:text-right">No more copying addresses between tabs or trying to remember which apartment had the red flag.</p>
          </div>
          <div className="mt-14 grid gap-10 border-t border-border pt-10 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map((tool) => (<div key={tool.title}><tool.icon size={22} className="text-primary" strokeWidth={1.6} /><h3 className="mt-5 text-lg font-semibold text-foreground">{tool.title}</h3><p className="mt-2 leading-relaxed text-foreground/60">{tool.copy}</p></div>))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 lg:px-8 lg:pb-32">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-foreground px-8 py-14 text-background md:px-14 md:py-16">
          <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-end">
            <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-background/55">Start with the apartment</p><h2 className="mt-5 text-4xl font-serif font-semibold leading-tight md:text-6xl">Keep the whole move in view.</h2></div>
            <Link href="/search" className="pressable inline-flex items-center gap-2 rounded-full bg-background px-7 py-4 text-sm font-semibold text-foreground transition-opacity duration-200 hover:opacity-90">Search StreetEasy <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
