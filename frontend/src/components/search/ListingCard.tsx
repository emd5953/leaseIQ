'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Heart, ImageOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { displayDate } from '@/components/research/ResearchReport'

export default function ListingCard({ listing }: { listing: any }) {
  const { user } = useAuth()
  const [imageFailed, setImageFailed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const photo = listing.images?.find((url: string) => /^https?:\/\//i.test(url))
  useEffect(() => { setSaved(false); if (user) api.checkListingSaved(listing._id).then(result => setSaved(result.isSaved)).catch(() => {}) }, [user, listing._id])
  async function save() {
    if (!user) { setMessage('Sign in to save this rental.'); return }
    setSaving(true)
    try { if (saved) await api.unsaveListing(listing._id); else await api.saveListing(listing._id); setSaved(!saved); setMessage('') }
    catch { setMessage('Could not save. Please retry.') }
    finally { setSaving(false) }
  }
  return <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-shadow hover:shadow-soft-lg">
    <div className="relative">
      <Link href={`/listing/${listing._id}`} aria-label={`View ${listing.title}`} className="flex aspect-[16/10] items-center justify-center overflow-hidden bg-card-alt">{photo && !imageFailed ? <img src={photo} alt={listing.title} loading="lazy" onError={() => setImageFailed(true)} className="h-full w-full object-cover" /> : <div className="text-center text-foreground/45"><ImageOff size={28} className="mx-auto mb-2" strokeWidth={1.3} /><span className="text-xs">No source photo</span></div>}</Link>
      <button onClick={save} disabled={saving} aria-label={saved ? `Unsave ${listing.title}` : `Save ${listing.title}`} aria-pressed={saved} className="absolute right-4 top-4 rounded-full bg-card/95 p-2.5 shadow-sm"><Heart size={18} fill={saved ? 'currentColor' : 'none'} className={saved ? 'text-accent' : 'text-foreground'} /></button>
      <span className="absolute bottom-3 left-4 rounded-full bg-card/95 px-3 py-1 text-xs font-medium">{listing.source}</span>
    </div>
    <div className="p-5"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-serif text-3xl">{listing.price == null ? 'Rent unknown' : `$${listing.price.toLocaleString()}`}<span className="font-sans text-sm text-foreground/60">{listing.price != null && (listing.pricePeriod === 'weekly' ? '/week' : listing.pricePeriod === 'daily' ? '/day' : '/mo')}</span></p>{listing.noFee === true && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">Listed no fee</span>}</div>
      <Link href={`/listing/${listing._id}`} className="mt-3 block font-semibold hover:text-primary">{listing.title}</Link><p className="mt-1 truncate text-xs text-foreground/60">{typeof listing.address === 'string' ? listing.address : listing.address?.street}</p>
      <p className="mt-4 text-sm text-foreground/80">{listing.bedrooms === 0 ? 'Studio' : listing.bedrooms == null ? 'Beds unknown' : `${listing.bedrooms} bed`} <span className="mx-2 text-border">/</span>{listing.bathrooms == null ? 'Baths unknown' : `${listing.bathrooms} bath`}<span className="mx-2 text-border">/</span>{listing.squareFeet ? `${listing.squareFeet.toLocaleString()} sq ft` : 'Area unknown'}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><span className={`text-xs ${listing.freshness === 'recent' ? 'text-foreground/65' : 'text-accent'}`}>{listing.lastSeenAt ? `Observed ${displayDate(listing.lastSeenAt)}${listing.freshness === 'stale' ? ' · Stale' : ''}` : 'Source date unknown'}</span><Link href={`/research?listingId=${listing._id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary">Research<ArrowUpRight size={14} /></Link></div>
      {message && <p role="status" className="mt-3 text-xs text-accent">{message}</p>}
    </div>
  </article>
}
