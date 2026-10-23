'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Heart, Scale, X } from 'lucide-react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import ListingCard from '@/components/search/ListingCard'
import { useShortlist } from '@/contexts/ShortlistContext'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { rentLabel } from '@/lib/listing-rent'
import { displayDate } from '@/components/research/ResearchReport'
export default function ShortlistPage() {
  const { saved, compared, ready, notice, toggleCompared, clearCompared, retry } = useShortlist()
  const { user } = useAuth()
  const [listings, setListings] = useState<any[]>([])
  const [failed, setFailed] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  const ids = [...new Set<string>([...saved, ...compared])].join(',')
  useEffect(() => {
    if (!ready) return
    let active = true
    setLoading(true)
    const wanted = ids.split(',').filter(Boolean)
    Promise.allSettled(wanted.map(id => api.getListingById(id))).then(results => {
      if (!active) return
      setListings(results.flatMap(r => r.status === 'fulfilled' ? [r.value] : []))
      setFailed(wanted.filter((_, i) => results[i].status === 'rejected')); setLoading(false)
    })
    return () => { active = false }
  }, [ids, ready, refresh])
  const selection = compared.map((id: string) => listings.find(l => l._id === id)).filter(Boolean)
  const rows: [string, (l: any) => string][] = [
    ['Advertised rent', l => `${rentLabel(l)}${l.price != null || l.buildingRent?.status === 'range' ? ` / ${l.pricePeriod === 'weekly' ? 'week' : l.pricePeriod === 'daily' ? 'day' : 'month'}` : ''}`],
    ['Scope', l => l.listingScope === 'building' ? 'Building range · confirm a unit' : l.addressDetails?.unit ? `Unit ${l.addressDetails.unit}` : 'Exact unit not identified'],
    ['Beds / baths', l => l.listingScope === 'building' ? 'Varies by unit' : `${l.bedrooms === 0 ? 'Studio' : l.bedrooms == null ? 'Unknown beds' : `${l.bedrooms} bed`} / ${l.bathrooms == null ? 'Unknown baths' : `${l.bathrooms} bath`}`],
    ['Area', l => l.squareFeet ? `${l.squareFeet.toLocaleString()} sq ft` : 'Not reported'],
    ['Broker fee', l => l.noFee === true ? 'Listed no fee' : l.noFee === false ? 'Fee reported' : 'Not reported'],
    ['Source check', l => l.verificationState === 'verified' ? 'Source matched' : 'Unverified · confirm details'],
    ['Last observed', l => `${displayDate(l.lastSeenAt)}${l.freshness === 'stale' ? ' · stale' : ''}`],
    ['Availability', l => l.isActive === false ? 'Marked inactive' : 'Confirm with source'],
  ]
  return <main className="min-h-screen"><Navigation /><div className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
    <header className="mb-8"><p className="eyebrow text-primary">Room to decide</p><h1 className="mt-3 font-serif text-4xl md:text-6xl">Your <em className="font-normal text-primary">shortlist.</em></h1><p className="mt-4 text-foreground/65">{user ? 'Saved to your account.' : 'Saved in this browser. No account needed.'} Compare up to three rentals.</p></header>
    {notice && <div role="status" className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{notice}{!ready && <button onClick={retry} className="ml-3 underline">Retry</button>}</div>}
    {!!failed.length && <div role="alert" className="mb-5 rounded-xl border border-accent/20 bg-card p-5 text-sm">{failed.length} saved rental{failed.length === 1 ? '' : 's'} could not load. Your selections are kept.<button onClick={() => setRefresh(refresh + 1)} className="ml-3 text-primary underline">Retry</button></div>}
    {loading || !ready ? <div role="status" className="grid gap-5 md:grid-cols-3">{[0, 1, 2].map(n => <div key={n} className="h-80 animate-pulse rounded-2xl bg-card-alt" />)}<span className="sr-only">Loading your shortlist</span></div> : <>
      {!!compared.length && <section id="compare" aria-label="Rental comparison" className="mb-10 scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-card"><div className="flex flex-wrap items-center justify-between gap-3 p-6"><h2 className="flex items-center gap-3 font-serif text-2xl"><Scale size={22} />Side by side</h2><button onClick={clearCompared} className="min-h-11 text-sm text-primary underline">Clear comparison</button></div><p className="px-6 pb-4 text-sm text-foreground/60">Freshly loaded listing details. Building ranges do not establish a unit’s rent.</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Compare advertised rental facts and source dates</caption><thead><tr><th scope="col" className="min-w-40 p-5 font-normal text-foreground/60">What matters</th>{selection.map((l: any) => <th scope="col" key={l._id} className="min-w-60 p-5"><div className="flex items-start justify-between gap-3"><Link href={`/listing/${l._id}`} className="text-base font-medium text-primary">{l.title}</Link><button onClick={() => toggleCompared(l._id)} aria-label={`Remove ${l.title} from comparison`} className="p-1"><X size={17} /></button></div></th>)}</tr></thead><tbody>{rows.map(([label, read]) => <tr key={label} className="border-t border-border even:bg-background/60"><th scope="row" className="p-5 font-normal text-foreground/65">{label}</th>{selection.map((l: any) => <td className="p-5" key={l._id}>{read(l)}</td>)}</tr>)}<tr className="border-t border-border"><th scope="row" className="p-5 font-normal text-foreground/65">Public records</th>{selection.map((l: any) => <td key={l._id} className="p-5"><Link href={`/research?listingId=${l._id}`} className="inline-flex items-center gap-2 font-semibold text-primary">Research building <ArrowRight size={14} /></Link></td>)}</tr></tbody></table></div></section>}
      {!saved.length ? <div className="rounded-2xl border border-dashed border-primary/25 bg-card px-6 py-16 text-center"><Heart className="mx-auto text-primary" size={30} strokeWidth={1.3} /><h2 className="mt-5 font-serif text-3xl">Make room for your favorites.</h2><p className="mx-auto mt-3 max-w-sm text-sm text-foreground/65">Tap a heart while browsing. Your shortlist will be here when you’re ready for a closer look.</p><Link href="/search" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">Find a place <ArrowRight size={16} /></Link></div> : <><div className="mb-5 flex items-center justify-between"><h2 className="font-serif text-2xl">Saved rentals <span className="ml-2 font-sans text-sm text-foreground/50">{saved.length}</span></h2><Link href="/search" className="text-sm text-primary">Keep exploring →</Link></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{listings.filter(l => saved.includes(l._id)).map(l => <ListingCard key={l._id} listing={l} />)}</div></>}
    </>}
  </div><Footer /></main>
}
