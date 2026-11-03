'use client'
import { apiJson } from '@/lib/api'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import SearchFilters, { emptyFilters, RentalFilters } from '@/components/search/SearchFilters'
import SearchResults from '@/components/search/SearchResults'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Heart, Scale, X } from 'lucide-react'
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
    const sort = new URLSearchParams(window.location.search).get('sort')
    if (sort) params.set('sort', sort)
    Object.entries(next).forEach(([key, value]) => {
      if (Array.isArray(value) ? value.length : value !== '' && value !== false)
        params.set(key, String(value))
    })
    window.history.pushState(null, '', `/search${params.size ? `?${params}` : ''}`)
  }
  const chips: { label: string; remove: () => void }[] = [
    ...(filters.q
      ? [{ label: `Search: ${filters.q}`, remove: () => apply({ ...filters, q: '' }) }]
      : []),
    ...(filters.minPrice || filters.maxPrice
      ? [
          {
            label: `$${filters.minPrice || '0'}–${filters.maxPrice ? '$' + filters.maxPrice : 'any'} / month`,
            remove: () => apply({ ...filters, minPrice: '', maxPrice: '' }),
          },
        ]
      : []),
    ...(filters.bedrooms !== ''
      ? [
          {
            label:
              filters.bedrooms === '0'
                ? 'Studio'
                : `${filters.bedrooms}${filters.bedrooms === '3' ? '+' : ''} beds`,
            remove: () => apply({ ...filters, bedrooms: '' }),
          },
        ]
      : []),
    ...(filters.bathrooms
      ? [
          {
            label: `${filters.bathrooms}+ baths`,
            remove: () => apply({ ...filters, bathrooms: '' }),
          },
        ]
      : []),
    ...filters.neighborhoods.map((b) => ({
      label: `Borough: ${b}`,
      remove: () =>
        apply({ ...filters, neighborhoods: filters.neighborhoods.filter((n) => n !== b) }),
    })),
    ...(filters.noFee
      ? [{ label: 'Listed no fee', remove: () => apply({ ...filters, noFee: false }) }]
      : []),
    ...(filters.petsAllowed
      ? [{ label: 'Pets allowed', remove: () => apply({ ...filters, petsAllowed: false }) }]
      : []),
  ]
  return (
    <main id="main-content" className={`min-h-screen ${compared.length ? 'pb-28' : ''}`}>
      <Navigation />
      <div className="mx-auto max-w-7xl px-5 pb-32 pt-28 sm:px-8 md:pt-32">
        <header className="workspace-header flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow text-primary">01 / The rental search</p>
            <h1 className="mt-3 page-title">Find your next place.</h1>
            <p className="mt-4 text-muted-foreground">
              A place to love. The evidence to choose.
            </p>
          </div>
          <Link
            href="/shortlist"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm"
          >
            <Heart size={16} />
            Your shortlist
            {saved.length > 0 && <span className="text-primary">{saved.length}</span>}
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
        {chips.length > 0 && (
          <div aria-label="Active filters" className="mt-4 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.label}
                onClick={chip.remove}
                aria-label={`Remove filter: ${chip.label}`}
                className="flex min-h-11 items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 text-xs text-primary"
              >
                {chip.label}
                <X size={12} />
              </button>
            ))}
          </div>
        )}
        <div className="mb-7 mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Source-reported rentals. Unverified listings stay visible.</span>
          <Link href="/research" className="inline-flex items-center gap-1 text-primary">
            Already have an address? Research it <ArrowUpRight size={13} />
          </Link>
        </div>
        {notice && (
          <p role="status" className="mb-4 rounded-xl bg-warning/10 p-4 text-sm text-warning">
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
