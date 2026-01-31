import Link from 'next/link'
import { Bed, Bath, Maximize, MapPin, Heart } from 'lucide-react'

interface ListingCardProps {
  listing: {
    _id: string
    title: string
    price: number
    bedrooms: number
    bathrooms: number
    squareFeet?: number
    address: string
    neighborhood?: string
    images: string[]
    source: string
    petsAllowed?: boolean
    noFee?: boolean
  }
}

export default function ListingCard({ listing }: ListingCardProps) {
  const imageUrl = listing.images?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80'

  return (
    <Link href={`/listing/${listing._id}`}>
      <div className="group bg-card rounded-3xl overflow-hidden shadow-soft hover:shadow-soft-lg hover:-translate-y-2 transition-all duration-500 border border-border">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          
          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {listing.noFee && (
              <span className="px-3 py-1 bg-primary text-background text-xs font-semibold rounded-full">
                No Fee
              </span>
            )}
            {listing.petsAllowed && (
              <span className="px-3 py-1 bg-accent text-background text-xs font-semibold rounded-full">
                Pets OK
              </span>
            )}
          </div>

          {/* Favorite Button */}
          <button className="absolute top-4 right-4 w-10 h-10 bg-card/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-card transition-colors duration-300">
            <Heart size={18} className="text-foreground" strokeWidth={1.5} />
          </button>

          {/* Source Badge */}
          <div className="absolute bottom-4 right-4">
            <span className="px-3 py-1 bg-foreground/80 backdrop-blur-sm text-background text-xs font-medium rounded-full">
              {listing.source}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Price */}
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-serif font-bold text-foreground">
              ${listing.price.toLocaleString()}
              <span className="text-base font-sans font-normal text-foreground/60">/mo</span>
            </p>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-foreground line-clamp-1">
            {listing.title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-2 text-foreground/70">
            <MapPin size={16} strokeWidth={1.5} />
            <p className="text-sm line-clamp-1">{listing.address}</p>
          </div>

          {/* Details */}
          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-1.5">
              <Bed size={16} className="text-primary" strokeWidth={1.5} />
              <span className="text-sm text-foreground/70">
                {listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} Bed`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bath size={16} className="text-primary" strokeWidth={1.5} />
              <span className="text-sm text-foreground/70">{listing.bathrooms} Bath</span>
            </div>
            {listing.squareFeet && (
              <div className="flex items-center gap-1.5">
                <Maximize size={16} className="text-primary" strokeWidth={1.5} />
                <span className="text-sm text-foreground/70">{listing.squareFeet} sqft</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
