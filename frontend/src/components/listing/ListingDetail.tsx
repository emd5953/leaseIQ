'use client'

import { useState, useEffect } from 'react'
import { Bed, Bath, Maximize, MapPin, Heart, Share2, AlertCircle, CheckCircle, ExternalLink, Dog, Cat, DollarSign, Calendar, Building, Info, Home, Zap, Droplets, Flame, Wifi, Car, FileText, Grid3X3, X, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

interface ListingDetailProps {
  listing: any
}

// SVG placeholder generator for listings without images
function generatePlaceholderSvg(color: string, label: string): string {
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" fill="none">
      <rect width="800" height="600" fill="#f5f5f0"/>
      <rect x="200" y="150" width="400" height="300" rx="12" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="3"/>
      <path d="M300 330 L400 240 L500 330" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="340" cy="270" r="30" fill="${color}" fill-opacity="0.3"/>
      <text x="400" y="520" text-anchor="middle" font-family="system-ui, sans-serif" font-size="20" fill="${color}">${label}</text>
    </svg>
  `)}`
}

function getPlaceholderImages(id: string): string[] {
  const colors = ['#8B7355', '#6B8E6B', '#7B8BA3', '#A38B7B', '#8B8B6B', '#7B6B8B']
  const labels = ['Living Area', 'Kitchen', 'Bedroom', 'Bathroom', 'Building', 'View']
  const hash = id?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0
  const startIndex = hash % colors.length
  
  return colors.map((_, i) => {
    const idx = (startIndex + i) % colors.length
    return generatePlaceholderSvg(colors[idx], labels[idx])
  })
}

function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return false
  const invalidPatterns = ['/homes/for_rent', '/rentals/', 'placeholder', '.svg', '/search']
  return !invalidPatterns.some(pattern => url.toLowerCase().includes(pattern))
}

// Actual floor plan images for demo
const SAMPLE_FLOOR_PLANS = [
  'https://images.rentals.com/floorplans/fp-1br-800.png',
  'https://images.rentals.com/floorplans/fp-2br-1000.png',
]

// SVG floor plan placeholder when no real floor plans available
const FLOOR_PLAN_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none">
  <rect width="400" height="300" fill="#f5f5f0"/>
  <rect x="20" y="20" width="360" height="260" fill="none" stroke="#1a1a1a" stroke-width="2"/>
  
  <!-- Living Room -->
  <rect x="20" y="20" width="180" height="150" fill="none" stroke="#1a1a1a" stroke-width="1"/>
  <text x="110" y="100" text-anchor="middle" font-family="serif" font-size="12" fill="#1a1a1a">Living Room</text>
  
  <!-- Kitchen -->
  <rect x="200" y="20" width="180" height="80" fill="none" stroke="#1a1a1a" stroke-width="1"/>
  <text x="290" y="65" text-anchor="middle" font-family="serif" font-size="12" fill="#1a1a1a">Kitchen</text>
  
  <!-- Bedroom -->
  <rect x="200" y="100" width="180" height="100" fill="none" stroke="#1a1a1a" stroke-width="1"/>
  <text x="290" y="155" text-anchor="middle" font-family="serif" font-size="12" fill="#1a1a1a">Bedroom</text>
  
  <!-- Bathroom -->
  <rect x="20" y="170" width="80" height="110" fill="none" stroke="#1a1a1a" stroke-width="1"/>
  <text x="60" y="230" text-anchor="middle" font-family="serif" font-size="10" fill="#1a1a1a">Bath</text>
  
  <!-- Closet -->
  <rect x="100" y="170" width="100" height="50" fill="none" stroke="#1a1a1a" stroke-width="1"/>
  <text x="150" y="200" text-anchor="middle" font-family="serif" font-size="10" fill="#1a1a1a">Closet</text>
  
  <!-- Entry -->
  <rect x="100" y="220" width="100" height="60" fill="none" stroke="#1a1a1a" stroke-width="1"/>
  <text x="150" y="255" text-anchor="middle" font-family="serif" font-size="10" fill="#1a1a1a">Entry</text>
  
  <!-- Door indicators -->
  <path d="M150 170 L150 160 A10 10 0 0 1 160 170" stroke="#1a1a1a" stroke-width="1" fill="none"/>
  <path d="M200 140 L190 140 A10 10 0 0 0 200 130" stroke="#1a1a1a" stroke-width="1" fill="none"/>
</svg>
`)}`

export default function ListingDetail({ listing }: ListingDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())
  const [showFloorPlanModal, setShowFloorPlanModal] = useState(false)
  const [currentFloorPlanIndex, setCurrentFloorPlanIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { user } = useAuth()

  // Check if listing is saved on mount
  useEffect(() => {
    if (user && listing._id) {
      api.checkListingSaved(listing._id)
        .then(result => setIsSaved(result.isSaved))
        .catch(() => {})
    }
  }, [user, listing._id])

  const handleSaveToggle = async () => {
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
    }
    setIsSaving(false)
  }

  const copyListingId = async () => {
    try {
      await navigator.clipboard.writeText(listing._id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  
  const placeholders = getPlaceholderImages(listing._id)
  const validImages = listing.images?.filter(isValidImageUrl) || []
  // Always show at least 4 images for a nice gallery
  const rawImages = validImages.length > 0 ? validImages : placeholders.slice(0, 4)
  
  const getImageUrl = (index: number) => {
    if (imageErrors.has(index)) return placeholders[index % placeholders.length]
    return rawImages[index] || placeholders[index % placeholders.length]
  }

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index))
  }

  // Safety check: if address is an object, convert it to string
  const addressString = typeof listing.address === 'string' 
    ? listing.address 
    : [
        listing.address?.street,
        listing.address?.unit,
        listing.address?.city,
        listing.address?.state,
        listing.address?.zipCode
      ].filter(Boolean).join(', ')

  // Get source URL from sources array or use sourceUrl directly
  const sourceUrl = listing.sources?.[0]?.sourceUrl || listing.sourceUrl || null
  const sourceName = listing.source || listing.sources?.[0]?.source || 'Unknown'
  
  // Floor plans - use listing floor plan images if available
  const floorPlans = listing.floorPlanImages?.length > 0 ? listing.floorPlanImages : []
  const hasRealFloorPlans = listing.floorPlanImages?.length > 0

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8">
      {/* Image Gallery */}
      <div className="mb-12">
        <div className="relative aspect-[16/9] rounded-[40px] overflow-hidden shadow-soft-xl mb-4">
          <img
            src={getImageUrl(currentImageIndex)}
            alt={listing.title}
            onError={() => handleImageError(currentImageIndex)}
            className="w-full h-full object-cover"
          />
          
          {/* Image Navigation */}
          {rawImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {rawImages.map((_: any, index: number) => (
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
        {rawImages.length > 1 && (
          <div className="grid grid-cols-4 gap-4">
            {rawImages.slice(0, 4).map((image: string, index: number) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`aspect-video rounded-2xl overflow-hidden ${
                  index === currentImageIndex ? 'ring-2 ring-primary' : ''
                }`}
              >
                <img 
                  src={getImageUrl(index)} 
                  alt="" 
                  onError={() => handleImageError(index)}
                  className="w-full h-full object-cover" 
                />
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
                  <p className="text-lg">{addressString}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleSaveToggle}
                  disabled={isSaving}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${
                    isSaved 
                      ? 'bg-red-100 text-red-500' 
                      : 'bg-card-alt hover:bg-primary/10'
                  }`}
                  title={isSaved ? 'Remove from saved' : 'Save listing'}
                >
                  <Heart size={20} strokeWidth={1.5} fill={isSaved ? 'currentColor' : 'none'} />
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
                {sourceName}
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

          {/* Pet Policy */}
          {listing.petPolicy && (
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Pet Policy</h2>
              <div className="grid grid-cols-2 gap-4 p-6 bg-card-alt rounded-2xl">
                <div className="flex items-center gap-3">
                  <Dog size={20} className={listing.petPolicy.dogsAllowed ? 'text-primary' : 'text-foreground/30'} strokeWidth={1.5} />
                  <div>
                    <p className="font-medium text-foreground">Dogs</p>
                    <p className="text-sm text-foreground/60">
                      {listing.petPolicy.dogsAllowed ? 'Allowed' : 'Not allowed'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Cat size={20} className={listing.petPolicy.catsAllowed ? 'text-primary' : 'text-foreground/30'} strokeWidth={1.5} />
                  <div>
                    <p className="font-medium text-foreground">Cats</p>
                    <p className="text-sm text-foreground/60">
                      {listing.petPolicy.catsAllowed ? 'Allowed' : 'Not allowed'}
                    </p>
                  </div>
                </div>
                {listing.petPolicy.petDeposit && (
                  <div className="col-span-2 flex items-center gap-3 pt-3 border-t border-border">
                    <DollarSign size={20} className="text-primary" strokeWidth={1.5} />
                    <div>
                      <p className="font-medium text-foreground">Pet Deposit</p>
                      <p className="text-sm text-foreground/60">${listing.petPolicy.petDeposit.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Building Information */}
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Building Information</h2>
            <div className="p-6 bg-card-alt rounded-2xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Building size={20} className="text-primary" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm text-foreground/60">Building Type</p>
                    <p className="font-medium text-foreground">{listing.buildingType || 'Apartment Building'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Home size={20} className="text-primary" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm text-foreground/60">Unit Type</p>
                    <p className="font-medium text-foreground">
                      {listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} Bedroom`}
                    </p>
                  </div>
                </div>
              </div>
              {listing.yearBuilt && (
                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <Calendar size={20} className="text-primary" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm text-foreground/60">Year Built</p>
                    <p className="font-medium text-foreground">{listing.yearBuilt}</p>
                  </div>
                </div>
              )}
              {listing.totalUnits && (
                <div className="flex items-center gap-3">
                  <Building size={20} className="text-primary" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm text-foreground/60">Total Units</p>
                    <p className="font-medium text-foreground">{listing.totalUnits} units</p>
                  </div>
                </div>
              )}
              {listing.parking && (
                <div className="flex items-center gap-3">
                  <Car size={20} className="text-primary" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm text-foreground/60">Parking</p>
                    <p className="font-medium text-foreground">{listing.parking}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Utilities & Services */}
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Utilities & Services</h2>
            <div className="p-6 bg-card-alt rounded-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Zap size={20} className={listing.utilities?.electric ? 'text-green-600' : 'text-foreground/30'} strokeWidth={1.5} />
                  <div>
                    <p className="font-medium text-foreground">Electric</p>
                    <p className="text-sm text-foreground/60">
                      {listing.utilities?.electric ? 'Included' : 'Tenant pays'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Flame size={20} className={listing.utilities?.gas ? 'text-green-600' : 'text-foreground/30'} strokeWidth={1.5} />
                  <div>
                    <p className="font-medium text-foreground">Gas</p>
                    <p className="text-sm text-foreground/60">
                      {listing.utilities?.gas ? 'Included' : 'Tenant pays'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Droplets size={20} className={listing.utilities?.water ? 'text-green-600' : 'text-foreground/30'} strokeWidth={1.5} />
                  <div>
                    <p className="font-medium text-foreground">Water</p>
                    <p className="text-sm text-foreground/60">
                      {listing.utilities?.water ? 'Included' : 'Tenant pays'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Wifi size={20} className={listing.utilities?.internet ? 'text-green-600' : 'text-foreground/30'} strokeWidth={1.5} />
                  <div>
                    <p className="font-medium text-foreground">Internet</p>
                    <p className="text-sm text-foreground/60">
                      {listing.utilities?.internet ? 'Included' : 'Tenant pays'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lease Terms */}
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Lease Terms</h2>
            <div className="p-6 bg-card-alt rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-primary" strokeWidth={1.5} />
                  <span className="text-foreground/70">Lease Length</span>
                </div>
                <span className="font-medium text-foreground">{listing.leaseLength || '12 months'}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign size={20} className="text-primary" strokeWidth={1.5} />
                  <span className="text-foreground/70">Security Deposit</span>
                </div>
                <span className="font-medium text-foreground">
                  {listing.securityDeposit ? `$${listing.securityDeposit.toLocaleString()}` : '1 month rent'}
                </span>
              </div>
              {listing.moveInCost && (
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-foreground/70">Est. Move-in Cost</span>
                  <span className="font-semibold text-foreground">${listing.moveInCost.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fees & Costs */}
          {listing.brokerFee && (
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Fees & Costs</h2>
              <div className="p-6 bg-card-alt rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign size={20} className="text-primary" strokeWidth={1.5} />
                    <span className="font-medium text-foreground">Broker Fee</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    listing.brokerFee.required 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {listing.brokerFee.required 
                      ? listing.brokerFee.amount 
                        ? `$${listing.brokerFee.amount.toLocaleString()}` 
                        : 'Required'
                      : 'No Fee'}
                  </span>
                </div>
                {listing.price?.amount && (
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-foreground/60">Monthly Rent</span>
                    <span className="font-semibold text-foreground">
                      ${listing.price.amount?.toLocaleString() || listing.price.toLocaleString()}/{listing.price.period || 'month'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Listing Details */}
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Listing Details</h2>
            <div className="p-6 bg-card-alt rounded-2xl space-y-4">
              {listing.availableDate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar size={20} className="text-primary" strokeWidth={1.5} />
                    <span className="text-foreground/70">Available Date</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {new Date(listing.availableDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
              )}
              {listing.squareFootage && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Maximize size={20} className="text-primary" strokeWidth={1.5} />
                    <span className="text-foreground/70">Square Footage</span>
                  </div>
                  <span className="font-medium text-foreground">{listing.squareFootage.toLocaleString()} sq ft</span>
                </div>
              )}
              {listing.address?.zipCode && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin size={20} className="text-primary" strokeWidth={1.5} />
                    <span className="text-foreground/70">ZIP Code</span>
                  </div>
                  <span className="font-medium text-foreground">{listing.address.zipCode}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Info size={20} className="text-primary" strokeWidth={1.5} />
                  <span className="text-foreground/70">Status</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  listing.isActive !== false
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {listing.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              {listing.createdAt && (
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-foreground/60 text-sm">First listed</span>
                  <span className="text-foreground/60 text-sm">
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {listing.updatedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-foreground/60 text-sm">Last updated</span>
                  <span className="text-foreground/60 text-sm">
                    {new Date(listing.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

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
              {/* Apply Now - Primary CTA */}
              {sourceUrl ? (
                <a 
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-4 bg-primary text-background rounded-full text-sm tracking-widest uppercase hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <FileText size={18} strokeWidth={1.5} />
                  Apply Now
                </a>
              ) : (
                <button className="w-full px-6 py-4 bg-primary text-background rounded-full text-sm tracking-widest uppercase hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-2">
                  <FileText size={18} strokeWidth={1.5} />
                  Apply Now
                </button>
              )}
              
              <button 
                onClick={copyListingId}
                className="w-full px-6 py-4 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300 flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check size={18} strokeWidth={1.5} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={18} strokeWidth={1.5} />
                    Copy Listing ID
                  </>
                )}
              </button>
              
              {/* View Floor Plans Button */}
              <button 
                onClick={() => setShowFloorPlanModal(true)}
                className="w-full px-6 py-4 bg-accent/10 text-accent border border-accent/20 rounded-full text-sm tracking-widest uppercase hover:bg-accent/20 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Grid3X3 size={18} strokeWidth={1.5} />
                View Floor Plans
              </button>
            </div>

            <div className="pt-6 border-t border-border space-y-4">
              <div>
                <p className="text-sm text-foreground/60 mb-1">Scraped from</p>
                <p className="font-semibold text-foreground">{sourceName}</p>
                {sourceUrl && (
                  <a 
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
                  >
                    View original listing
                    <ExternalLink size={14} strokeWidth={1.5} />
                  </a>
                )}
              </div>
              {listing.availableDate && (
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Available</p>
                  <p className="font-semibold text-foreground">
                    {new Date(listing.availableDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {listing.availableUnits && (
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Available Units</p>
                  <p className="font-semibold text-foreground">{listing.availableUnits} units</p>
                </div>
              )}
              {(listing.petPolicy?.dogsAllowed || listing.petPolicy?.catsAllowed) && (
                <div className="flex items-center gap-2">
                  {listing.petPolicy.dogsAllowed && <Dog size={18} className="text-primary" strokeWidth={1.5} />}
                  {listing.petPolicy.catsAllowed && <Cat size={18} className="text-primary" strokeWidth={1.5} />}
                  <span className="text-sm text-foreground/70">Pets welcome</span>
                </div>
              )}
              {listing.brokerFee?.required === false && (
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-600" strokeWidth={1.5} />
                  <span className="text-sm text-green-700 font-medium">No broker fee</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floor Plan Modal */}
      {showFloorPlanModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-2xl font-serif font-bold text-foreground">Floor Plans</h3>
              <button 
                onClick={() => setShowFloorPlanModal(false)}
                className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center hover:bg-foreground/10 transition-colors"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            
            {/* Floor Plan Content */}
            {hasRealFloorPlans ? (
              <>
                <div className="relative aspect-[4/3] bg-foreground/5">
                  <img 
                    src={floorPlans[currentFloorPlanIndex]} 
                    alt={`Floor plan ${currentFloorPlanIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Navigation Arrows */}
                  {floorPlans.length > 1 && (
                    <>
                      <button 
                        onClick={() => setCurrentFloorPlanIndex(prev => prev === 0 ? floorPlans.length - 1 : prev - 1)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card shadow-lg flex items-center justify-center hover:bg-card-alt transition-colors"
                      >
                        <ChevronLeft size={24} strokeWidth={1.5} />
                      </button>
                      <button 
                        onClick={() => setCurrentFloorPlanIndex(prev => prev === floorPlans.length - 1 ? 0 : prev + 1)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card shadow-lg flex items-center justify-center hover:bg-card-alt transition-colors"
                      >
                        <ChevronRight size={24} strokeWidth={1.5} />
                      </button>
                    </>
                  )}
                </div>
                
                {/* Modal Footer with real floor plans */}
                <div className="p-6 border-t border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-foreground/60">
                      {floorPlans.length > 1 ? `Floor plan ${currentFloorPlanIndex + 1} of ${floorPlans.length}` : '1 floor plan available'}
                    </p>
                    <Link
                      href={`/lease-analyzer?listingId=${listing._id}`}
                      className="px-6 py-3 bg-accent text-background rounded-full text-sm tracking-widest uppercase hover:bg-accent/90 transition-all duration-300"
                    >
                      Analyze Floor Plan
                    </Link>
                  </div>
                  
                  {/* Thumbnail Strip */}
                  {floorPlans.length > 1 && (
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                      {floorPlans.map((fp: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => setCurrentFloorPlanIndex(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                            index === currentFloorPlanIndex ? 'border-primary' : 'border-transparent'
                          }`}
                        >
                          <img src={fp} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* No floor plans available */
              <div className="p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-foreground/5 flex items-center justify-center">
                  <Grid3X3 size={32} className="text-foreground/40" strokeWidth={1.5} />
                </div>
                <h4 className="text-xl font-serif font-bold text-foreground mb-2">
                  No Floor Plans Available
                </h4>
                <p className="text-foreground/60 mb-6 max-w-md mx-auto">
                  This listing doesn't have floor plans yet. Check the original listing or contact the landlord for floor plan details.
                </p>
                {sourceUrl && (
                  <a 
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300"
                  >
                    View Original Listing
                    <ExternalLink size={16} strokeWidth={1.5} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
