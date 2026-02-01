'use client'

import { useState } from 'react'
import { SlidersHorizontal, Bell } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

interface SearchFiltersProps {
  onApplyFilters: (filters: any) => void
}

export default function SearchFilters({ onApplyFilters }: SearchFiltersProps) {
  const { user } = useAuth()
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    neighborhoods: [] as string[],
    petsAllowed: false,
    noFee: false,
  })
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleClearFilters = () => {
    const clearedFilters = {
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      bathrooms: '',
      neighborhoods: [] as string[],
      petsAllowed: false,
      noFee: false,
    }
    setFilters(clearedFilters)
    onApplyFilters({})
  }

  const handleSaveSearch = async () => {
    if (!searchName.trim()) {
      alert('Please enter a name for this search')
      return
    }

    setIsSaving(true)
    try {
      await api.createSavedSearch({
        name: searchName,
        criteria: {
          minPrice: filters.minPrice ? Number(filters.minPrice) : null,
          maxPrice: filters.maxPrice ? Number(filters.maxPrice) : null,
          minBedrooms: filters.bedrooms ? Number(filters.bedrooms) : null,
          neighborhoods: filters.neighborhoods,
          requiresDogsAllowed: filters.petsAllowed,
          noFeeOnly: filters.noFee,
        },
        alertsEnabled: true,
        alertFrequency: 'daily',
        alertMethod: 'email',
      })
      setShowSaveModal(false)
      setSearchName('')
      alert('Search saved! You\'ll receive alerts when new listings match.')
    } catch (error) {
      console.error('Failed to save search:', error)
      alert('Failed to save search. Please try again.')
    }
    setIsSaving(false)
  }

  const neighborhoods = [
    'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island',
    'Williamsburg', 'Park Slope', 'Astoria', 'Long Island City'
  ]

  return (
    <div className="bg-card rounded-3xl p-6 shadow-soft border border-border sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <SlidersHorizontal size={20} className="text-primary" strokeWidth={1.5} />
        <h2 className="text-xl font-serif font-semibold text-foreground">Filters</h2>
      </div>

      <div className="space-y-6">
        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Price Range
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
              className="px-4 py-2 bg-card-alt rounded-full border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-sm"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
              className="px-4 py-2 bg-card-alt rounded-full border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-sm"
            />
          </div>
        </div>

        {/* Bedrooms */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Bedrooms
          </label>
          <select
            value={filters.bedrooms}
            onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
            className="w-full px-4 py-2 bg-card-alt rounded-full border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-sm"
          >
            <option value="">Any</option>
            <option value="0">Studio</option>
            <option value="1">1 Bed</option>
            <option value="2">2 Beds</option>
            <option value="3">3+ Beds</option>
          </select>
        </div>

        {/* Bathrooms */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Bathrooms
          </label>
          <select
            value={filters.bathrooms}
            onChange={(e) => setFilters({ ...filters, bathrooms: e.target.value })}
            className="w-full px-4 py-2 bg-card-alt rounded-full border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-sm"
          >
            <option value="">Any</option>
            <option value="1">1 Bath</option>
            <option value="2">2 Baths</option>
            <option value="3">3+ Baths</option>
          </select>
        </div>

        {/* Neighborhoods */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Neighborhoods
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {neighborhoods.map((neighborhood) => (
              <label key={neighborhood} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.neighborhoods.includes(neighborhood)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFilters({
                        ...filters,
                        neighborhoods: [...filters.neighborhoods, neighborhood],
                      })
                    } else {
                      setFilters({
                        ...filters,
                        neighborhoods: filters.neighborhoods.filter((n) => n !== neighborhood),
                      })
                    }
                  }}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                />
                <span className="text-sm text-foreground/70">{neighborhood}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3 pt-4 border-t border-border">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.petsAllowed}
              onChange={(e) => setFilters({ ...filters, petsAllowed: e.target.checked })}
              className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
            />
            <span className="text-sm text-foreground/70">Pets Allowed</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.noFee}
              onChange={(e) => setFilters({ ...filters, noFee: e.target.checked })}
              className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
            />
            <span className="text-sm text-foreground/70">No Fee</span>
          </label>
        </div>

        {/* Apply Button */}
        <button 
          onClick={() => onApplyFilters(filters)}
          className="w-full px-6 py-3 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300"
        >
          Apply Filters
        </button>

        {/* Clear Button */}
        <button 
          onClick={handleClearFilters}
          className="w-full px-6 py-3 bg-transparent text-foreground border border-border rounded-full text-sm tracking-widest uppercase hover:bg-card-alt transition-all duration-300"
        >
          Clear Filters
        </button>

        {/* Save Search Button */}
        {user && (
          <button 
            onClick={() => setShowSaveModal(true)}
            className="w-full px-6 py-3 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm tracking-widest uppercase hover:bg-primary/20 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Bell size={16} />
            Save Search & Get Alerts
          </button>
        )}
      </div>

      {/* Save Search Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Save This Search</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Get email alerts when new listings match your criteria.
            </p>
            <input
              type="text"
              placeholder="Name your search (e.g., '2BR Brooklyn under $3k')"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg bg-background mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSearch}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save & Enable Alerts'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
