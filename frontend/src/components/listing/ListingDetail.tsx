'use client'

import { useState } from 'react'
import { Bed, Bath, Maximize, MapPin, Heart, Share2, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface ListingDetailProps {
  listing: any
}

export default function ListingDetail({ listing }: ListingDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const images = listing.images?.length > 0 
    ? listing.images 
    : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80']

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8">
      {/* Image Gallery */}
      <div className="mb-12">
        <div className="relative aspect-[16/9] rounded-[40px] overflow-hidden shadow-soft-xl mb-4">
          <img
            src={images[currentImageIndex]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
          
          {/* Image Navigation */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentImageIndex
                      ? 'bg-card w-8'
                      : 'bg-card/50 hover:bg-card/75'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail Grid */}
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-4">
            {images.slice(0, 4).map((image: string, index: number) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`aspect-video rounded-2xl overflow-hidden ${
                  index === currentImageIndex ? 'ring-2 ring-primary' : ''
                }`}
              >
                <img src={image} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
                  {listing.title}
                </h1>
                <div className="flex items-center gap-2 text-foreground/70">
                  <MapPin size={20} strokeWidth={1.5} />
                  <p className="text-lg">{listing.address}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="w-12 h-12 bg-card-alt rounded-full flex items-center justify-center hover:bg-primary/10 transition-colors duration-300">
                  <Heart size={20} strokeWidth={1.5} />
                </button>
                <button className="w-12 h-12 bg-card-alt rounded-full flex items-center justify-center hover:bg-primary/10 transition-colors duration-300">
                  <Share2 size={20} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {listing.noFee && (
                <span className="px-4 py-2 bg-primary/10 text-primary text-sm font-semibold rounded-full">
                  No Fee
                </span>
              )}
              {listing.petsAllowed && (
                <span className="px-4 py-2 bg-accent/10 text-accent text-sm font-semibold rounded-full">
                  Pets Allowed
                </span>
              )}
              <span className="px-4 py-2 bg-foreground/5 text-foreground text-sm font-medium rounded-full">
                {listing.source}
              </span>
            </div>
          </div>

          {/* Key Details */}
          <div className="grid grid-cols-3 gap-6 p-8 bg-card-alt rounded-3xl">
            <div className="text-center">
              <Bed size={24} className="text-primary mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-2xl font-serif font-bold text-foreground">
                {listing.bedrooms === 0 ? 'Studio' : listing.bedrooms}
              </p>
              <p className="text-sm text-foreground/70">Bedrooms</p>
            </div>
            <div className="text-center">
              <Bath size={24} className="text-primary mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-2xl font-serif font-bold text-foreground">{listing.bathrooms}</p>
              <p className="text-sm text-foreground/70">Bathrooms</p>
            </div>
            <div className="text-center">
              <Maximize size={24} className="text-primary mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-2xl font-serif font-bold text-foreground">
                {listing.squareFeet || 'N/A'}
              </p>
              <p className="text-sm text-foreground/70">Sq Ft</p>
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Description</h2>
              <p className="text-foreground/70 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>
          )}

          {/* Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Amenities</h2>
              <div className="grid grid-cols-2 gap-3">
                {listing.amenities.map((amenity: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-primary" strokeWidth={1.5} />
                    <span className="text-foreground/70">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Research CTA */}
          <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10">
            <div className="flex items-start gap-4">
              <AlertCircle size={24} className="text-primary flex-shrink-0 mt-1" strokeWidth={1.5} />
              <div className="flex-1">
                <h3 className="text-xl font-serif font-bold text-foreground mb-2">
                  Want to know more about this listing?
                </h3>
                <p className="text-foreground/70 mb-4">
                  Get landlord reviews, building violations, and neighborhood insights before you tour.
                </p>
                <Link
                  href={`/research?listingId=${listing._id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300"
                >
                  Research This Listing
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-3xl p-8 shadow-soft border border-border sticky top-24">
            <div className="mb-6">
              <p className="text-4xl font-serif font-bold text-foreground mb-1">
                ${listing.price.toLocaleString()}
              </p>
              <p className="text-foreground/60">per month</p>
            </div>

            <div className="space-y-3 mb-6">
              <button className="w-full px-6 py-4 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300">
                Contact Landlord
              </button>
              <button className="w-full px-6 py-4 bg-transparent text-primary border border-primary rounded-full text-sm tracking-widest uppercase hover:bg-primary hover:text-background transition-all duration-300">
                Schedule Tour
              </button>
            </div>

            <div className="pt-6 border-t border-border space-y-4">
              <div>
                <p className="text-sm text-foreground/60 mb-1">Listed by</p>
                <p className="font-semibold text-foreground">{listing.source}</p>
              </div>
              {listing.availableDate && (
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Available</p>
                  <p className="font-semibold text-foreground">
                    {new Date(listing.availableDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
