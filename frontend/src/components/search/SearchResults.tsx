'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, RefreshCw, Search } from 'lucide-react'
import ListingCard from './ListingCard'
import { api, SearchFilters, SearchOptions } from '@/lib/api'

type SortOption = 'newest' | 'price-asc' | 'price-desc'
export default function SearchResults({ filters, triggerSearch, onReset }: { filters: any; triggerSearch: number; onReset: () => void }) {
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortOption>('newest')
  const [refresh, setRefresh] = useState(0)
  const [queryTime, setQueryTime] = useState<string | null>(null)
  const returnTo = typeof window === 'undefined' ? '/search' : `/search${window.location.search}`
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setPage(Math.max(1, Math.floor(Number(params.get('page')) || 1)))
    const requestedSort = params.get('sort')
    setSort(requestedSort === 'price-asc' || requestedSort === 'price-desc' ? requestedSort : 'newest')
  }, [triggerSearch])
  function navigate(nextPage: number, nextSort = sort) {
    setPage(nextPage); setSort(nextSort)
    const params = new URLSearchParams(window.location.search)
    if (nextPage > 1) params.set('page', String(nextPage)); else params.delete('page')
    if (nextSort !== 'newest') params.set('sort', nextSort); else params.delete('sort')
    window.history.pushState(null, '', `/search${params.size ? `?${params}` : ''}`)
  }
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    const apiFilters: SearchFilters = {
      q: filters.q,
      minPrice: filters.minPrice !== '' && filters.minPrice != null ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice !== '' && filters.maxPrice != null ? Number(filters.maxPrice) : undefined,
      minBedrooms: filters.bedrooms !== '' && filters.bedrooms != null ? Number(filters.bedrooms) : undefined,
      maxBedrooms: filters.bedrooms !== '' && filters.bedrooms != null && Number(filters.bedrooms) < 3 ? Number(filters.bedrooms) : undefined,
      minBathrooms: filters.bathrooms ? Number(filters.bathrooms) : undefined,
      neighborhoods: filters.neighborhoods, petsAllowed: filters.petsAllowed || undefined, noFee: filters.noFee || undefined,
    }
    const options: SearchOptions = { page, limit: 12, sortBy: sort === 'newest' ? 'createdAt' : 'price', sortOrder: sort === 'price-asc' ? 'asc' : 'desc' }
    api.searchListings(apiFilters, options, controller.signal).then(result => {
      if (controller.signal.aborted) return
      setListings(result.listings); setTotal(result.total); setPages(result.totalPages); setQueryTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    }).catch(e => { if (!controller.signal.aborted) setError(e.message || 'Search unavailable') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [filters, page, sort, refresh, triggerSearch])
  return <div aria-busy={loading}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div aria-live="polite"><p className="font-semibold">{loading ? 'Finding rentals…' : error ? 'Search unavailable' : `${total.toLocaleString()} rental${total === 1 ? '' : 's'}`}</p>{!loading && queryTime && !error && <p className="mt-1 text-xs text-muted-foreground">Updated {queryTime} · Check source dates before applying</p>}</div>
      <div className="flex items-center gap-3"><button onClick={() => setRefresh(refresh + 1)} aria-label="Refresh search results" disabled={loading} className="rounded-full border border-border p-2.5 disabled:opacity-40"><RefreshCw size={16} /></button><label className="sr-only" htmlFor="sort">Sort rentals</label><select id="sort" className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm" value={sort} onChange={e => { navigate(1, e.target.value as SortOption) }}><option value="newest">Recently added</option><option value="price-asc">Rent / month: low to high</option><option value="price-desc">Rent / month: high to low</option></select></div>
    </div>
    {sort !== 'newest' && <p className="mb-4 text-xs text-muted-foreground">Weekly and daily rates sort by estimated monthly equivalent (52 weeks or 365 days ÷ 12). Building and unknown rents appear last.</p>}
    {loading ? <div role="status" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"><span className="sr-only">Loading rental listings</span>{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-[28rem] animate-pulse rounded-3xl border border-border bg-card-alt" />)}</div>
      : error ? <div role="alert" className="rounded-3xl border border-accent/20 bg-card p-8"><h2 className="font-heading text-2xl">Listings are unavailable right now</h2><p className="mt-3 text-sm text-foreground/75">{error}</p><div className="mt-6 flex flex-wrap gap-4"><button onClick={() => setRefresh(refresh + 1)} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Retry search</button><Link href="/research" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">Research an address <ArrowRight size={16} /></Link></div></div>
      : listings.length === 0 && total > 0 ? <div role="status" className="rounded-3xl border border-border bg-card p-8 text-center"><h2 className="font-heading text-2xl">This results page is no longer available</h2><p className="mt-3 text-sm text-muted-foreground">There are {pages} pages matching your filters. Return to the first page to continue browsing.</p><button onClick={() => navigate(1)} className="btn btn-accent mt-5">Return to first page</button></div>
      : listings.length === 0 ? <div className="rounded-3xl border border-border bg-card p-12 text-center"><Search size={28} className="mx-auto text-primary" /><h2 className="mt-5 font-heading text-2xl">No rentals match these filters</h2><p className="mt-3 text-sm text-foreground/70">Try a broader budget or another borough. You can research any NYC street address without finding a listing here.</p><button onClick={onReset} className="mt-5 mr-5 rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground">Reset filters</button><Link href="/research" className="mt-5 inline-block text-sm font-semibold text-primary underline">Research an address</Link></div>
      : <><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{listings.map(listing => <ListingCard listing={listing} returnTo={returnTo} key={listing._id} />)}</div><div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6"><button disabled={page === 1} onClick={() => navigate(page - 1)} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm disabled:opacity-30"><ArrowLeft size={16} />Previous</button><span className="text-sm text-foreground/70">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => navigate(page + 1)} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm disabled:opacity-30">Next<ArrowRight size={16} /></button></div></>}
  </div>
}
