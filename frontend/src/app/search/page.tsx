'use client'
import { apiJson } from '@/lib/api'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import SearchFilters, { emptyFilters, RentalFilters } from '@/components/search/SearchFilters'
import SearchResults from '@/components/search/SearchResults'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Heart, Scale } from 'lucide-react'
import { useShortlist } from '@/contexts/ShortlistContext'
function fromUrl(): RentalFilters {
  const p = new URLSearchParams(window.location.search)
  return {
    ...emptyFilters,
    q: p.get('q') || '',
    minPrice: p.get('minPrice') || '',
    maxPrice: p.get('maxPrice') || '',
    bedrooms: p.get('bedrooms') || '',
    bathrooms: p.get('bathrooms') || '',
    neighborhoods: (p.get('neighborhoods') || '').split(',').filter(Boolean),
    noFee: p.get('noFee') === 'true',
    petsAllowed: p.get('petsAllowed') === 'true',
  }
}
export default function SearchPage() {
  const [health, setHealth] = useState<any>(null)
  useEffect(() => {
    apiJson('/api/jobs/health')
      .then(setHealth)
      .catch(() => setHealth({ refresh: { status: 'unavailable' } }))
  }, [])
  const [filters, setFilters] = useState<RentalFilters>(emptyFilters)
  const [ready, setReady] = useState(false)
  const [revision, setRevision] = useState(0)
  const { saved, compared, notice } = useShortlist()
  useEffect(() => {
    const sync = () => {
      setFilters(fromUrl())
      setRevision((v) => v + 1)
      setReady(true)
    }
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  function apply(next: RentalFilters) {
    setFilters(next)
    setRevision((v) => v + 1)
    const params = new URLSearchParams()
    Object.entries(next).forEach(([key, value]) => {
      if (Array.isArray(value) ? value.length : value !== '' && value !== false)
        params.set(key, String(value))
    })
    window.history.pushState(null, '', `/search${params.size ? `?${params}` : ''}`)
  }
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 sm:px-8 md:pt-32">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow text-primary">New York, your way</p>
            <h1 className="mt-3 font-serif text-4xl tracking-tight md:text-6xl">
              Find your <em className="font-normal text-primary">next chapter.</em>
            </h1>
            <p className="mt-4 text-foreground/65">A place to love. The evidence to choose.</p>
          </div>
          <Link
            href="/shortlist"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm"
          >
            <Heart size={16} />
            Your shortlist{saved.length > 0 && <span className="text-primary">{saved.length}</span>}
          </Link>
        </header>
        {health && (
          <p role="status" className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
            Refresh job: {health.refresh?.status?.replace('_', ' ')}.{' '}
            {health.refresh?.lastSuccess
              ? 'Last successful import: ' +
                new Date(health.refresh.lastSuccess).toLocaleString() +
                '.'
              : 'No recent successful import could be confirmed.'}{' '}
            Source observation dates are shown on each listing.
          </p>
        )}
        {ready && <SearchFilters key={revision} value={filters} onApplyFilters={apply} />}
        <div className="mb-7 mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-foreground/60">
          <span>Source-reported rentals. Unverified listings stay visible.</span>
          <Link href="/research" className="inline-flex items-center gap-1 text-primary">
            Already have an address? Research it <ArrowUpRight size={13} />
          </Link>
        </div>
        {notice && (
          <p role="status" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
            {notice}
          </p>
        )}
        {ready && (
          <SearchResults
            filters={filters}
            triggerSearch={revision}
            onReset={() => apply(emptyFilters)}
          />
        )}
      </div>
      {compared.length > 0 && (
        <aside
          aria-label="Comparison tray"
          className="fixed inset-x-4 bottom-5 z-30 mx-auto flex max-w-lg items-center justify-between gap-4 rounded-2xl bg-foreground p-4 text-background shadow-soft-xl"
        >
          <div className="flex items-center gap-3">
            <Scale size={20} />
            <span className="text-sm">{compared.length} of 3 selected</span>
          </div>
          <Link
            href="/shortlist#compare"
            className="rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground"
          >
            Compare rentals
          </Link>
        </aside>
      )}
      <Footer />
    </main>
  )
}
