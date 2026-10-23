'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, Building2, Heart, Share2, Search, MapPin, ImageOff, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import SaveButton from '@/components/SaveButton'
import { api } from '@/lib/api'
import { displayDate } from '@/components/research/ResearchReport'
import { rentLabel } from '@/lib/listing-rent'
const money = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? `$${value.toLocaleString()}` : 'Not reported'
const policy = (value: unknown, yes: string, no: string) => value === true ? yes : value === false ? no : 'Not reported'
const safeUrl = (value: unknown): value is string => typeof value === 'string' && /^https?:\/\//i.test(value)

export default function ListingDetail({ listing }: { listing: any }) {
  const [message, setMessage] = useState('')
  const [imageIndex, setImageIndex] = useState(0)
  const [failedImages, setFailedImages] = useState<string[]>([])
  const images: string[] = (listing.images || []).filter(safeUrl).filter((url: string) => !failedImages.includes(url))
  const image = images[Math.min(imageIndex, Math.max(0, images.length - 1))]
  const sourceUrl = safeUrl(listing.sourceUrl) ? listing.sourceUrl : null
  const facts: [string, string][] = [
    ['Bedrooms', listing.bedrooms === 0 ? 'Studio' : listing.bedrooms == null ? 'Not reported' : String(listing.bedrooms)],
    ['Bathrooms', listing.bathrooms == null ? 'Not reported' : String(listing.bathrooms)],
    ['Area', listing.squareFeet ? `${listing.squareFeet.toLocaleString()} sq ft` : 'Not reported'],
    ['Available', displayDate(listing.availableDate)],
  ]
  async function share() {
    try { await navigator.clipboard.writeText(window.location.href); setMessage('Property link copied.') }
    catch { setMessage('Copy the address from your browser to share this property.') }
  }
  return <div className="mx-auto max-w-7xl px-5 sm:px-8">
    <Link href="/search" className="mb-7 inline-flex items-center gap-2 text-sm text-primary"><ArrowLeft size={16} />Back to rentals</Link>
    <div className="mb-7 flex flex-wrap items-start justify-between gap-5">
      <div><p className="eyebrow text-primary">Property overview</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">{listing.title}</h1><p className="mt-4 flex items-start gap-2 text-foreground/70"><MapPin size={18} className="mt-1 shrink-0" />{listing.address}</p><div className="mt-4 lg:hidden"><p className="text-2xl font-semibold tracking-tight">{rentLabel(listing)}{(listing.price != null || listing.buildingRent?.status === 'range') && <span className="ml-2 text-sm font-normal text-foreground/60">/{listing.pricePeriod === 'weekly' ? 'week' : listing.pricePeriod === 'daily' ? 'day' : 'mo'}</span>}</p>{listing.listingScope === 'building' && <p className="mt-1 text-xs text-primary">Building pricing · confirm an exact unit</p>}</div></div>
      <div className="flex gap-2"><SaveButton id={listing._id} title={listing.title} /><button onClick={share} className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm"><Share2 size={16} />Share</button></div>
    </div>
    {message && <p role="status" className="mb-5 rounded-xl bg-primary/10 p-4 text-sm">{message}</p>}
    {listing.verificationState !== 'verified' && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Unverified listing. Source observations do not confirm the exact property, current rent or availability.</p>}
    {listing.duplicateOf && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">This historical record referred to the same building page. <Link href={`/listing/${listing.duplicateOf}`} className="underline">View the verified building listing.</Link></p>}
    {listing.listingScope === 'building' && !listing.duplicateOf && <p className="mb-5 rounded-xl bg-primary/10 p-4 text-sm">This source advertises a building, not a specific apartment. The rents shown cover advertised floor plans; confirm exact unit pricing and availability with the source.</p>}
    {listing.sourceVerification?.status === 'source_mismatch' && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">The original source now points to a different property. It cannot verify this address or its current rent. A replacement source or exact unit is required.</p>}
    {listing.sourceIdentityNeedsReview && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{listing.identityWarning || 'Source associations need review. Confirm the exact unit and rent before relying on this listing.'}</p>}
    {listing.rentNeedsReview && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">Current rent is unknown until an exact unit price can be verified.</p>}
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-8">
        <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-3xl border border-border bg-card-alt">
          {image ? <img src={image} alt={`Listing photo ${imageIndex + 1} for ${listing.title}`} className="h-full w-full object-cover" onError={() => setFailedImages([...failedImages, image])} /> : <div className="text-center text-foreground/55"><ImageOff className="mx-auto mb-3" size={32} strokeWidth={1.3} /><p>Photos not available</p><p className="mt-1 text-xs">Check the original listing for current images.</p></div>}
          {images.length > 1 && <div className="absolute bottom-4 flex items-center gap-4 rounded-full bg-card/95 px-3 py-2 text-sm"><button aria-label="Previous photo" onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)} className="p-1"><ChevronLeft size={18} /></button>{Math.min(imageIndex + 1, images.length)} / {images.length}<button aria-label="Next photo" onClick={() => setImageIndex((imageIndex + 1) % images.length)} className="p-1"><ChevronRight size={18} /></button></div>}
        </div>
        <div className="grid grid-cols-2 gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-4">{facts.map(([label, value]) => <div key={label}><p className="text-xs text-foreground/65">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div>)}</div>
        <section className="rounded-3xl border border-primary/20 bg-primary/5 p-7"><div className="flex items-start gap-4"><Building2 size={26} className="shrink-0 text-primary" /><div><p className="eyebrow text-primary">Look beyond the listing</p><h2 className="mt-2 font-serif text-2xl">What do the public records say?</h2><p className="mt-3 text-sm leading-relaxed text-foreground/75">Check the building’s housing violations, ownership and management filings, and local context. Every report separates source facts from analysis and gaps.</p><Link href={`/research?listingId=${listing._id}`} className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"><Search size={16} />Research this property</Link></div></div></section>
        <section><h2 className="font-serif text-2xl">From the listing</h2><p className="mt-1 text-xs text-foreground/60">Source-reported information, not independently verified.</p><p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{listing.description || 'No description was provided by the source.'}</p>{!!listing.amenities?.length && <div className="mt-5 flex flex-wrap gap-2">{listing.amenities.map((item: string) => <span key={item} className="rounded-full bg-card-alt px-3 py-2 text-xs">{item}</span>)}</div>}</section>
        <details className="rounded-3xl border border-border bg-card p-6"><summary className="cursor-pointer font-serif text-2xl">Costs, terms & everyday details</summary><p className="mt-2 text-sm text-foreground/65">Confirm these details in writing. Missing information stays unknown.</p><dl className="mt-5 grid gap-x-8 sm:grid-cols-2">{[
          ['Lease length', listing.leaseLength || 'Not reported'], ['Security deposit', money(listing.securityDeposit)], ['Application fee', money(listing.applicationFee)],
          ['Broker fee', listing.noFee === true ? 'Listed as no fee' : listing.noFee === false ? listing.brokerFee?.amount != null ? money(listing.brokerFee.amount) : 'Fee reported; amount unknown' : 'Not reported'],
          ['Pets', listing.petPolicy?.restrictions || policy(listing.petsAllowed, 'Allowed per listing; confirm restrictions', 'Not allowed per listing')], ['Laundry', listing.laundry || 'Not reported'],
          ['Parking', listing.parking || 'Not reported'], ['Building type', listing.buildingType || 'Not reported'],
          ...['electric', 'gas', 'water', 'internet'].map(key => [key[0].toUpperCase() + key.slice(1), policy(listing.utilities?.[key], 'Included per listing', 'Not listed as included; confirm')]),
        ].map(([label, value]) => <div key={label} className="border-b border-border py-4"><dt className="text-xs text-foreground/65">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>)}</dl></details>
        <details className="rounded-2xl border border-border bg-card p-6"><summary className="cursor-pointer text-sm font-semibold">Source trail & observation dates</summary><p className="mt-3 text-sm text-foreground/65">An observation records what a source reported. It does not guarantee availability.</p><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-foreground/60">Identity check</dt><dd className="mt-1">{listing.verificationState === 'verified' ? `Source matched · ${displayDate(listing.sourceVerification?.checkedAt)}` : 'Not verified'}</dd></div><div><dt className="text-xs text-foreground/60">Rent observed</dt><dd className="mt-1">{displayDate(listing.rentObservedAt)}</dd></div></dl>{listing.rentEvidence && <p className="mt-4 rounded-xl bg-card-alt p-3 text-xs">Extracted quote: {listing.rentEvidence.raw == null ? 'Not reported' : String(listing.rentEvidence.raw).slice(0, 300)} · {listing.rentEvidence.period}</p>}<ul className="mt-4 divide-y divide-border">{(listing.sources || []).map((source: any, i: number) => <li key={i} className="py-3 text-sm"><span className="font-medium capitalize">{source.source || source.sourceName}</span><span className="ml-2 text-xs text-foreground/60">Observed {displayDate(source.lastSeenAt || source.scrapedAt)}</span>{safeUrl(source.sourceUrl) && <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-primary underline">{source.sourceUrl}</a>}</li>)}</ul></details>
        <section><h2 className="font-serif text-2xl">Floor plans</h2>{listing.floorPlanImages?.filter(safeUrl).length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{listing.floorPlanImages.filter(safeUrl).map((url: string, i: number) => <a key={url} href={url} target="_blank" rel="noreferrer" className="rounded-xl border border-border bg-card p-3"><img src={url} alt={`Source floor plan ${i + 1}`} className="w-full object-contain" /><span className="mt-2 block text-xs text-primary">Open source floor plan <ArrowUpRight size={12} className="inline" /></span></a>)}</div> : <p className="mt-3 text-sm text-foreground/65">No floor plan provided. Request a plan and confirm measurements during your tour.</p>}</section>
      </div>
      <aside className="space-y-5 lg:sticky lg:top-28">
        <div className="rounded-3xl border border-border bg-card p-7"><p className="eyebrow text-foreground/60">{listing.listingScope === 'building' ? 'Advertised building rents' : 'Advertised rent'}</p><p className="mt-3 font-serif text-4xl">{rentLabel(listing)}</p><p className="mt-1 text-sm text-foreground/65">{listing.pricePeriod === 'weekly' ? 'per week' : listing.pricePeriod === 'daily' ? 'per day' : 'per month'} · verify current terms</p>
          <Link href={`/research?listingId=${listing._id}`} className="mt-6 flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-white"><Search size={16} />Research property</Link>
          {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold">View original listing<ArrowUpRight size={16} /></a>}
          <div className="mt-6 border-t border-border pt-5"><p className="text-sm font-semibold">{listing.source}</p><p className="mt-2 text-sm text-foreground/70">Last observed: {displayDate(listing.lastSeenAt)}</p><p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-950/80">{listing.isActive === false ? 'This listing is marked inactive.' : listing.freshness === 'stale' ? 'This listing has not been observed in over 72 hours. Price and availability may have changed.' : listing.freshness === 'unknown' ? 'A reliable source observation date is unavailable.' : 'Recently observed at the source. Availability is not guaranteed.'} Confirm availability directly before applying.</p></div>
        </div>
      </aside>
    </div>
  </div>
}
