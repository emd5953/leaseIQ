'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Building2, Check, Plus } from 'lucide-react'
import SaveButton from '@/components/SaveButton'
import { useShortlist } from '@/contexts/ShortlistContext'
import { displayDate } from '@/components/research/ResearchReport'
import { rentLabel } from '@/lib/listing-rent'
export default function ListingCard({ listing }: { listing: any }) {
  const [imageFailed, setImageFailed] = useState(false)
  const { compared, toggleCompared } = useShortlist()
  const photo = listing.images?.find((url: string) => /^https?:\/\//i.test(url))
  const building = listing.listingScope === 'building'
  const selected = compared.includes(listing._id)
  const verified = listing.verificationState === 'verified'
  return <article className="listing-card group overflow-hidden rounded-2xl border border-border bg-card">
    <div className="relative">
      <Link href={`/listing/${listing._id}`} aria-label={`View ${listing.title}`} className="flex aspect-[16/10] items-center justify-center overflow-hidden bg-card-alt">{photo && !imageFailed ? <img src={photo} alt={listing.title} loading="lazy" onError={() => setImageFailed(true)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" /> : <div className="photo-placeholder flex h-full w-full flex-col items-center justify-center text-primary/65"><Building2 size={44} strokeWidth={.8} /><span className="mt-3 text-xs">Source photo unavailable</span></div>}</Link>
      <div className="absolute right-3 top-3"><SaveButton id={listing._id} title={listing.title} compact /></div>
      <span className="absolute bottom-3 left-3 rounded-full bg-card/95 px-3 py-1.5 text-[11px] font-medium capitalize">{listing.source?.replace(/_/g, ' ')}</span>
      {building && <span className="absolute left-3 top-3 rounded-full bg-foreground px-3 py-1.5 text-[11px] text-white">Building · multiple floor plans</span>}
    </div>
    <div className="p-5">
      <div className="flex flex-wrap items-baseline gap-x-2"><p className={`font-semibold tracking-tight tabular-nums ${building ? 'text-2xl' : 'text-[28px]'}`}>{rentLabel(listing)}</p>{(listing.price != null || listing.buildingRent?.status === 'range') && <span className="text-xs text-foreground/60">/{listing.pricePeriod === 'weekly' ? 'week' : listing.pricePeriod === 'daily' ? 'day' : 'mo'}</span>}</div>
      <Link href={`/listing/${listing._id}`} className="mt-2 block text-lg font-medium hover:text-primary">{listing.title}{listing.addressDetails?.unit ? ` #${listing.addressDetails.unit}` : ''}</Link>
      <p className="mt-1 truncate text-sm text-foreground/60">{listing.addressDetails?.city || listing.address}</p>
      <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm">{building ? 'Unit details vary' : <>{listing.bedrooms === 0 ? 'Studio' : listing.bedrooms == null ? 'Beds unknown' : `${listing.bedrooms} bed`}<span className="text-border">·</span>{listing.bathrooms == null ? 'Baths unknown' : `${listing.bathrooms} bath`}{listing.squareFeet ? <><span className="text-border">·</span>{listing.squareFeet.toLocaleString()} ft²</> : null}</>}{listing.noFee === true && <span className="text-primary">Listed no fee</span>}</p>
      <div className={`mt-4 rounded-lg px-3 py-2 text-xs ${verified ? 'bg-primary/5 text-primary' : 'bg-amber-50 text-amber-950'}`}><span className="font-medium">{verified ? 'Source matched' : listing.sourceIdentityNeedsReview ? 'Identity needs review' : 'Unverified listing'}</span><span className="mx-1.5 opacity-40">·</span>{listing.freshness === 'stale' ? 'Stale observation' : listing.lastSeenAt ? `Seen ${displayDate(listing.lastSeenAt)}` : 'Date unknown'}</div>
      <div className="mt-4 flex items-center justify-between gap-2"><button aria-pressed={selected} aria-label={`${selected ? 'Remove from comparison' : 'Compare'} ${listing.title}`} onClick={() => toggleCompared(listing._id)} className="flex min-h-11 items-center gap-1.5 text-sm text-foreground/75">{selected ? <Check size={15} /> : <Plus size={15} />}{selected ? 'Comparing' : 'Compare'}</button><Link href={`/research?listingId=${listing._id}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary">Research<ArrowUpRight size={15} /></Link></div>
    </div>
  </article>
}
