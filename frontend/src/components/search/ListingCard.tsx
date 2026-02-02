'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bed, Bath, Maximize, MapPin, Heart } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

interface ListingCardProps {
  listing: {
    _id: string
    title: string
    price: number
    bedrooms: number
    bathrooms: number
    squareFeet?: number
    address: string | {
      street?: string
      unit?: string
      city?: string
      state?: string
      zipCode?: string
    }
    neighborhood?: string
    images: string[]
    source: string
    petsAllowed?: boolean
    noFee?: boolean
  }
}

// SVG placeholder for listings without images
function getPlaceholderImage(id: string): string {
  // Use listing ID to pick a consistent accent color
  const colors = ['#8B7355', '#6B8E6B', '#7B8BA3', '#A38B7B', '#8B8B6B']
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const color = colors[hash % colors.length]
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none">
      <rect width="400" height="300" fill="#f5f5f0"/>
      <rect x="100" y="80" width="200" height="140" rx="8" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="2"/>
      <path d="M150 160 L200 120 L250 160" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="170" cy="130" r="15" fill="${color}" fill-opacity="0.3"/>
      <text x="200" y="250" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="${color}">No Image Available</text>
    </svg>
  `)}`
}

function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return false
  const invalidPatterns = [
    '/homes/for_rent',
    '/rentals/',
    'placeholder',
    '.svg',
    '/search',
  ]
  return !invalidPatterns.some(pattern => url.toLowerCase().includes(pattern))
}

export default function ListingCard({ listing }: ListingCardProps) {
  const { user } = useAuth()
  const hasValidImage = isValidImageUrl(listing.images?.[0])
  const placeholderImage = getPlaceholderImage(listing._id)
  const [imageUrl, setImageUrl] = useState(hasValidImage ? listing.images[0] : placeholderImage)
  const [imageError, setImageError] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Check if listing is saved on mount (uses cached data)
  useEffect(() => {
    if (user && listing._id) {
      api.checkListingSaved(listing._id)
        .then(result => setIsSaved(result.isSaved))
        .catch(() => {})
    }
  }, [user, listing._id])

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user) {
      alert('Please sign in to save listings')
      return
    }

    setIsSaving(true)
    try {
      if (isSaved) {
        await api.unsaveListing(listing._id)
        setIsSaved(false)
      } else {
        await api.saveListing(listing._id)
        setIsSaved(true)
      }
    } catch (error) {
      console.error('Failed to save listing:', error)
      alert('Failed to save listing. Please try again.')
    }
    setIsSaving(false)
  }

  const handleImageError = () => {
    if (!imageError) {
      setImageError(true)
      setImageUrl(placeholderImage)
    }
  }
  
  const addressString = typeof listing.address === 'string' 
    ? listing.address 
    : [
        (listing.address as any)?.street,
        (listing.address as any)?.unit,
        (listing.address as any)?.city,
        (listing.address as any)?.state,
        (listing.address as any)?.zipCode
      ].filter(Boolean).join(', ')

  return (
    <Link href={`/listing/${listing._id}`}>
      <div className="group bg-card rounded-3xl overflow-hidden shadow-soft hover:shadow-soft-lg hover:-translate-y-2 transition-all duration-500 border border-border">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={imageUrl}
            alt={listing.title}
            onError={handleImageError}
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
          <button 
            onClick={handleSaveToggle}
            disabled={isSaving}
            className={`absolute top-4 right-4 w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors duration-300 ${
              isSaved 
                ? 'bg-red-100 text-red-500' 
                : 'bg-card/90 hover:bg-card text-foreground'
            }`}
          >
            <Heart size={18} strokeWidth={1.5} fill={isSaved ? 'currentColor' : 'none'} />
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
            <p className="text-sm line-clamp-1">{addressString}</p>
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
