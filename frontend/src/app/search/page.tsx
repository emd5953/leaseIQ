'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import SearchFilters from '@/components/search/SearchFilters'
import SearchResults from '@/components/search/SearchResults'
import { useState } from 'react'
import { Radio } from 'lucide-react'

export default function SearchPage() {
  const [filters, setFilters] = useState({})
  const [triggerSearch, setTriggerSearch] = useState(0)

  const handleApplyFilters = (newFilters: any) => {
    setFilters(newFilters)
    setTriggerSearch(prev => prev + 1) // Trigger re-fetch
  }

  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-32 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <Radio size={14} strokeWidth={2} />
                StreetEasy workspace
              </div>
              <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-4">
                Find your <span className="italic">next place</span>
              </h1>
              <p className="text-lg text-foreground/70">
                Search, shortlist, and investigate NYC rentals before you apply.
              </p>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-foreground/55 md:text-right">
              Listings are refreshed throughout the day so your shortlist stays current.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <aside className="lg:col-span-1">
              <SearchFilters onApplyFilters={handleApplyFilters} />
            </aside>
            <div className="lg:col-span-3">
              <SearchResults filters={filters} triggerSearch={triggerSearch} />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
