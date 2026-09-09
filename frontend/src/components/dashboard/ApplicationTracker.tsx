'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Building2, CheckCircle2, FileText, Search } from 'lucide-react'
import { api } from '@/lib/api'

type TrackerStatus = 'interested' | 'touring' | 'applied' | 'lease' | 'moved'

interface TrackerListing {
  _id: string
  title?: string
  price?: { amount?: number } | number
  bedrooms?: number
  bathrooms?: number
  address?: { street?: string } | string
  images?: string[]
  status?: TrackerStatus
}

interface ApplicationTrackerProps {
  userId: string
  listings: TrackerListing[]
}

const stages: { id: TrackerStatus; label: string; description: string }[] = [
  { id: 'interested', label: 'Interested', description: 'Places you want to look into' },
  { id: 'touring', label: 'Touring', description: 'Tours and follow-ups in motion' },
  { id: 'applied', label: 'Applied', description: 'Applications you have sent' },
  { id: 'lease', label: 'Lease review', description: 'Ready to read the fine print' },
  { id: 'moved', label: 'Moved in', description: 'Make the place your home' },
]

function listingStreet(listing: TrackerListing) {
  if (typeof listing.address === 'string') return listing.address
  return listing.address?.street || 'Saved apartment'
}

function listingPrice(listing: TrackerListing) {
  const price = typeof listing.price === 'number' ? listing.price : listing.price?.amount
  return price ? `$${price.toLocaleString()}/mo` : 'Price unavailable'
}

export default function ApplicationTracker({ userId, listings }: ApplicationTrackerProps) {
  const storageKey = `leaseiq_tracker_${userId}`
  const [statuses, setStatuses] = useState<Record<string, TrackerStatus>>({})

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored) {
        setStatuses(JSON.parse(stored))
      } else {
        setStatuses(Object.fromEntries(listings.map(listing => [listing._id, listing.status || 'interested'])))
      }
    } catch {
      // Keep the tracker usable if local storage is unavailable.
    }
  }, [storageKey, listings])

  const updateStatus = async (listingId: string, status: TrackerStatus) => {
    const next = { ...statuses, [listingId]: status }
    setStatuses(next)
    window.localStorage.setItem(storageKey, JSON.stringify(next))
    try {
      await api.updateSavedListingStatus(listingId, status)
    } catch {
      // Keep the optimistic local state if the API is temporarily unavailable.
    }
  }

  const grouped = useMemo(() => stages.map(stage => ({
    ...stage,
    listings: listings.filter(listing => (statuses[listing._id] || 'interested') === stage.id),
  })), [listings, statuses])

  if (listings.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center">
        <Search size={28} className="mx-auto text-primary" strokeWidth={1.6} />
        <h2 className="mt-4 text-2xl font-serif font-semibold text-foreground">Your apartment plan starts with a shortlist.</h2>
        <p className="mx-auto mt-2 max-w-md text-foreground/60">Save a StreetEasy listing and use this space to move it from first look to move-in.</p>
        <Link href="/search" className="pressable mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background">Find an apartment <ArrowRight size={16} /></Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your move</p><h2 className="mt-2 text-3xl font-serif font-semibold text-foreground">Keep every apartment in view.</h2></div>
        <p className="max-w-sm text-sm leading-relaxed text-foreground/55 md:text-right">Statuses are saved on this device for now. Move a listing forward as your search gets real.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {grouped.map(stage => (
          <section key={stage.id} className="min-h-[250px] rounded-2xl border border-border bg-card-alt/60 p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-foreground">{stage.label}</h3><p className="mt-1 text-xs leading-relaxed text-foreground/50">{stage.description}</p></div><span className="rounded-full bg-card px-2 py-1 text-xs font-semibold text-foreground/50">{stage.listings.length}</span></div>
            <div className="mt-4 space-y-3">
              {stage.listings.map(listing => (
                <article key={listing._id} className="overflow-hidden rounded-xl border border-border bg-card">
                  {listing.images?.[0] && <img src={listing.images[0]} alt="" className="h-24 w-full object-cover" />}
                  <div className="p-3"><p className="line-clamp-1 text-sm font-semibold text-foreground">{listingStreet(listing)}</p><p className="mt-1 text-xs text-foreground/55">{listingPrice(listing)} · {listing.bedrooms ?? 0} bed · {listing.bathrooms ?? 0} bath</p><div className="mt-3 flex items-center gap-2"><Link href={`/listing/${listing._id}`} className="text-xs font-semibold text-primary hover:text-foreground">Open listing</Link><select aria-label={`Move ${listingStreet(listing)} to another stage`} value={statuses[listing._id] || 'interested'} onChange={event => updateStatus(listing._id, event.target.value as TrackerStatus)} className="min-w-0 flex-1 rounded-lg border border-border bg-card-alt px-2 py-1 text-[11px] text-foreground">{stages.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div></div>
                </article>
              ))}
              {stage.listings.length === 0 && <p className="pt-5 text-xs text-foreground/35">Nothing here yet.</p>}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-3">
        <Link href="/research" className="pressable flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-card-alt"><Building2 size={20} className="text-primary" /><span className="text-sm font-semibold">Research a building</span></Link>
        <Link href="/lease-analyzer" className="pressable flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-card-alt"><FileText size={20} className="text-primary" /><span className="text-sm font-semibold">Review a lease</span></Link>
        <Link href="/search" className="pressable flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-card-alt"><CheckCircle2 size={20} className="text-primary" /><span className="text-sm font-semibold">Find another place</span></Link>
      </div>
    </div>
  )
}
