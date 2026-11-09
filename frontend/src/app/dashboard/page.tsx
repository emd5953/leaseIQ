'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Dialog from '@/components/ui/Dialog'
import { useShortlist } from '@/contexts/ShortlistContext'
import { useAuth } from '@/contexts/AuthContext'
import { api, UserPreferences, SavedSearch } from '@/lib/api'
import { rentLabel } from '@/lib/listing-rent'
import ApplicationTracker from '@/components/dashboard/ApplicationTracker'
import {
  Heart,
  Bell,
  Settings,
  Trash2,
  Send,
  Plus,
  X,
  ClipboardList,
  DollarSign,
  Bed,
  Bath,
  PawPrint,
  MapPin,
} from 'lucide-react'

type TabType = 'tracker' | 'saved' | 'alerts' | 'preferences'

export default function DashboardPage() {
  const router = useRouter()
  const { retry: reloadShortlist } = useShortlist()
  const { user, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('saved')
  const [savedListings, setSavedListings] = useState<any[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [preferences, setPreferences] = useState<UserPreferences>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showNewSearchModal, setShowNewSearchModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sendingAlert, setSendingAlert] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const loadGeneration = useRef(0)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Fetch on tab entry so each view reflects the account, including another device's changes.
  useEffect(() => {
    if (user) void loadData()
    return () => {
      loadGeneration.current++
    }
  }, [user, activeTab])

  const switchTab = (tab: TabType) => {
    if (tab === activeTab) return
    setError(null)
    setNotice(null)
    setIsLoading(true)
    setActiveTab(tab)
  }

  const loadData = async () => {
    const generation = ++loadGeneration.current
    setIsLoading(true)
    setError(null)
    try {
      if (activeTab === 'saved' || activeTab === 'tracker') {
        const listings = await api.getSavedListings()
        if (generation !== loadGeneration.current) return
        setSavedListings(listings)
      } else if (activeTab === 'alerts') {
        const [searches, inbox] = await Promise.all([
          api.getSavedSearches(),
          api.getNotifications(),
        ])
        if (generation !== loadGeneration.current) return
        setSavedSearches(searches)
        setNotifications(inbox)
      } else if (activeTab === 'preferences') {
        const prefs = await api.getPreferences()
        if (generation !== loadGeneration.current) return
        setPreferences(prefs)
        setPreferencesLoaded(true)
      }
    } catch (error) {
      if (generation !== loadGeneration.current) return
      console.error('Failed to load data:', error)
      setError(error instanceof Error ? error.message : 'Something went wrong. Please retry.')
    }
    if (generation === loadGeneration.current) setIsLoading(false)
  }

  const handleUnsaveListing = async (listingId: string) => {
    try {
      await api.unsaveListing(listingId)
      reloadShortlist()
      setSavedListings((prev) => prev.filter((l) => l._id !== listingId))
    } catch (error) {
      console.error('Failed to unsave listing:', error)
      setError(error instanceof Error ? error.message : 'Something went wrong. Please retry.')
    }
  }

  const handleDeleteSearch = async (searchId: string) => {
    try {
      await api.deleteSavedSearch(searchId)
      setSavedSearches((prev) => prev.filter((s) => s._id !== searchId))
    } catch (error) {
      console.error('Failed to delete search:', error)
      setError(error instanceof Error ? error.message : 'Something went wrong. Please retry.')
    }
  }

  const handleToggleAlerts = async (search: SavedSearch) => {
    try {
      const updated = await api.updateSavedSearch(search._id!, {
        alertsEnabled: !search.alertsEnabled,
      })
      setSavedSearches((prev) => prev.map((s) => (s._id === search._id ? updated : s)))
    } catch (error) {
      console.error('Failed to toggle alerts:', error)
      setError(error instanceof Error ? error.message : 'Something went wrong. Please retry.')
    }
  }

  const handleTestAlert = async (searchId: string) => {
    setError(null)
    setNotice(null)
    if (sendingAlert) return
    setSendingAlert(searchId)
    try {
      const result = await api.testSavedSearchAlert(searchId)
      setNotice(
        result.error || result.message || 'Search checked. Your delivery preferences apply.',
      )
      setNotifications(await api.getNotifications())
    } catch (error) {
      console.error('Failed to send test alert:', error)
      setError(error instanceof Error ? error.message : 'Something went wrong. Please retry.')
    } finally {
      setSendingAlert(null)
    }
  }

  const handleSavePreferences = async () => {
    if (
      preferences.minPrice != null &&
      preferences.maxPrice != null &&
      preferences.minPrice > preferences.maxPrice
    ) {
      setError('Minimum rent must be below maximum rent.')
      return
    }
    setIsSaving(true)
    setError(null)
    setNotice(null)
    try {
      const saved = await api.updatePreferences(preferences)
      // Don't override the state with the response - keep what the user typed
      setNotice('Preferences saved.')
    } catch (error) {
      console.error('Failed to save preferences:', error)
      setError(error instanceof Error ? error.message : 'Something went wrong. Please retry.')
    }
    setIsSaving(false)
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main id="main-content" className="pt-28 pb-20 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="workspace-header">
            <p className="eyebrow mb-4 text-primary">05 / Your workspace</p>
            <h1 className="page-title">
              Welcome back, {user.displayName || user.email.split('@')[0]}
            </h1>
            <p className="text-muted-foreground mt-2">
              Keep your apartment search, applications, and lease details together
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-danger/25 bg-danger/10 text-danger p-4"
            >
              {error}{' '}
              <button className="underline ml-3" onClick={loadData}>
                Reload data
              </button>
            </div>
          )}
          {notice && (
            <p role="status" className="mb-6 rounded-2xl border border-border p-4">
              {notice}
            </p>
          )}
          {activeTab === 'alerts' && !!notifications.length && (
            <section
              aria-label="In-app notifications"
              className="mb-6 rounded-2xl border border-border bg-card p-5"
            >
              <h2 className="font-heading text-2xl">Notifications</h2>
              <ul className="mt-3 space-y-4">
                {notifications.map((n) => (
                  <li key={n._id}>
                    <p className="font-semibold">
                      {n.payload?.name} · {n.listingIds.length} new source observations
                    </p>
                    <p className="text-xs">
                      {new Date(n.sentAt).toLocaleString()} · Confirm current availability with
                      the source.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {n.listingIds.map((id: string, i: number) => (
                        <Link
                          className="text-sm text-primary underline"
                          href={`/listing/${id}`}
                          key={id}
                        >
                          View listing {i + 1}
                        </Link>
                      ))}
                      {!n.readAt && (
                        <button
                          className="text-sm underline"
                          onClick={async () => {
                            try {
                              await api.readNotification(n._id)
                              setNotifications(await api.getNotifications())
                            } catch (e) {
                              setNotice((e as Error).message)
                            }
                          }}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Workspace views"
            className="flex gap-2 mb-8 overflow-x-auto border-b border-border"
          >
            <button
              role="tab"
              aria-selected={activeTab === 'tracker'}
              tabIndex={activeTab === 'tracker' ? 0 : -1}
              aria-controls="workspace-panel"
              id="tab-tracker"
              onKeyDown={(e) => {
                const tabs: TabType[] = ['tracker', 'saved', 'alerts', 'preferences']
                const index = tabs.indexOf(activeTab)
                const next =
                  e.key === 'ArrowRight'
                    ? tabs[(index + 1) % 4]
                    : e.key === 'ArrowLeft'
                      ? tabs[(index + 3) % 4]
                      : e.key === 'Home'
                        ? tabs[0]
                        : e.key === 'End'
                          ? tabs[3]
                          : null
                if (next) {
                  e.preventDefault()
                  switchTab(next)
                  document.getElementById('tab-' + next)?.focus()
                }
              }}
              onClick={() => switchTab('tracker')}
              className={`flex shrink-0 items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'tracker'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <ClipboardList size={18} />
              Application Tracker
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'saved'}
              tabIndex={activeTab === 'saved' ? 0 : -1}
              aria-controls="workspace-panel"
              id="tab-saved"
              onKeyDown={(e) => {
                const tabs: TabType[] = ['tracker', 'saved', 'alerts', 'preferences']
                const index = tabs.indexOf(activeTab)
                const next =
                  e.key === 'ArrowRight'
                    ? tabs[(index + 1) % 4]
                    : e.key === 'ArrowLeft'
                      ? tabs[(index + 3) % 4]
                      : e.key === 'Home'
                        ? tabs[0]
                        : e.key === 'End'
                          ? tabs[3]
                          : null
                if (next) {
                  e.preventDefault()
                  switchTab(next)
                  document.getElementById('tab-' + next)?.focus()
                }
              }}
              onClick={() => switchTab('saved')}
              className={`flex shrink-0 items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'saved'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Heart size={18} />
              Saved Listings
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'alerts'}
              tabIndex={activeTab === 'alerts' ? 0 : -1}
              aria-controls="workspace-panel"
              id="tab-alerts"
              onKeyDown={(e) => {
                const tabs: TabType[] = ['tracker', 'saved', 'alerts', 'preferences']
                const index = tabs.indexOf(activeTab)
                const next =
                  e.key === 'ArrowRight'
                    ? tabs[(index + 1) % 4]
                    : e.key === 'ArrowLeft'
                      ? tabs[(index + 3) % 4]
                      : e.key === 'Home'
                        ? tabs[0]
                        : e.key === 'End'
                          ? tabs[3]
                          : null
                if (next) {
                  e.preventDefault()
                  switchTab(next)
                  document.getElementById('tab-' + next)?.focus()
                }
              }}
              onClick={() => switchTab('alerts')}
              className={`flex shrink-0 items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'alerts'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bell size={18} />
              Search Alerts
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'preferences'}
              tabIndex={activeTab === 'preferences' ? 0 : -1}
              aria-controls="workspace-panel"
              id="tab-preferences"
              onKeyDown={(e) => {
                const tabs: TabType[] = ['tracker', 'saved', 'alerts', 'preferences']
                const index = tabs.indexOf(activeTab)
                const next =
                  e.key === 'ArrowRight'
                    ? tabs[(index + 1) % 4]
                    : e.key === 'ArrowLeft'
                      ? tabs[(index + 3) % 4]
                      : e.key === 'Home'
                        ? tabs[0]
                        : e.key === 'End'
                          ? tabs[3]
                          : null
                if (next) {
                  e.preventDefault()
                  switchTab(next)
                  document.getElementById('tab-' + next)?.focus()
                }
              }}
              onClick={() => switchTab('preferences')}
              className={`flex shrink-0 items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'preferences'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings size={18} />
              Preferences
            </button>
          </div>

          <div
            id="workspace-panel"
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            tabIndex={0}
          >
            {/* Content */}
            {isLoading ? (
              <div role="status" className="surface p-12 text-center text-muted-foreground">
                Loading your workspace…
              </div>
            ) : (
              <>
                {/* Apartment Tracker Tab */}
                {activeTab === 'tracker' && (
                  <ApplicationTracker
                    key={user.id}
                    userId={user.id}
                    listings={savedListings}
                    onStatusSaved={(id, status) =>
                      setSavedListings((rows) =>
                        rows.map((row) => (row._id === id ? { ...row, status } : row)),
                      )
                    }
                  />
                )}

                {/* Saved Listings Tab */}
                {activeTab === 'saved' && (
                  <div>
                    {savedListings.length === 0 ? (
                      <div className="text-center py-12">
                        <Heart size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No saved listings yet</p>
                        <Link
                          href="/search"
                          className="inline-block mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Browse Listings
                        </Link>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {savedListings.map((listing) => (
                          <div
                            key={listing._id}
                            className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                          >
                            <Link href={`/listing/${listing._id}`}>
                              <div className="aspect-video photo-placeholder relative">
                                {!listing.images?.[0] && (
                                  <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                                    Source photo unavailable
                                  </span>
                                )}
                                {listing.images?.[0] && (
                                  <img
                                    src={listing.images[0]}
                                    alt={
                                      typeof listing.address === 'string'
                                        ? listing.address
                                        : listing.address?.street || listing.title
                                    }
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                            </Link>
                            <div className="p-4">
                              <div className="flex flex-wrap gap-4 justify-between items-start">
                                <div>
                                  <p className="font-semibold text-lg">
                                    {rentLabel(listing)}
                                    {listing.price?.amount != null ||
                                    listing.buildingRent?.status === 'range'
                                      ? ` / ${listing.price?.period === 'weekly' ? 'week' : listing.price?.period === 'daily' ? 'day' : 'mo'}`
                                      : ''}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {typeof listing.address === 'string'
                                      ? listing.address
                                      : listing.address?.street || listing.title}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {listing.listingScope === 'building'
                                      ? 'Building pricing · confirm a unit'
                                      : `${listing.bedrooms === 0 ? 'Studio' : listing.bedrooms == null ? 'Beds unknown' : `${listing.bedrooms} bed`} · ${listing.bathrooms == null ? 'Baths unknown' : `${listing.bathrooms} bath`}`}
                                    <span className="mt-2 block text-xs text-accent">
                                      Source-reported · verify availability
                                    </span>
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleUnsaveListing(listing._id)}
                                  className="p-2 text-danger hover:bg-danger/10 rounded-full transition-colors"
                                  aria-label={`Remove ${listing.title || 'listing'} from saved`}
                                  title="Remove from saved"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Search Alerts Tab */}
                {activeTab === 'alerts' && (
                  <div>
                    <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                      <p className="text-muted-foreground">
                        Get notified when new listings match your criteria
                      </p>
                      <button
                        onClick={() => setShowNewSearchModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <Plus size={18} />
                        New Alert
                      </button>
                    </div>

                    {savedSearches.length === 0 ? (
                      <div className="text-center py-12">
                        <Bell size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No search alerts set up</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Create an alert to get notified about new listings
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {savedSearches.map((search) => (
                          <div
                            key={search._id}
                            className="bg-card border border-border rounded-lg p-4"
                          >
                            <div className="flex flex-wrap gap-4 justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-lg">{search.name}</h3>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {search.criteria.maxPrice && (
                                    <span className="text-xs bg-muted px-2 py-1 rounded">
                                      Up to ${search.criteria.maxPrice.toLocaleString()}
                                    </span>
                                  )}
                                  {search.criteria.minBedrooms && (
                                    <span className="text-xs bg-muted px-2 py-1 rounded">
                                      {search.criteria.minBedrooms}+ beds
                                    </span>
                                  )}
                                  {search.criteria.neighborhoods &&
                                    search.criteria.neighborhoods.length > 0 && (
                                      <span className="text-xs bg-muted px-2 py-1 rounded">
                                        {search.criteria.neighborhoods.join(', ')}
                                      </span>
                                    )}
                                  {search.criteria.requiresDogsAllowed && (
                                    <span className="text-xs bg-muted px-2 py-1 rounded">
                                      Dogs OK
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
                                  {search.alertFrequency} alerts via {search.alertMethod}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleAlerts(search)}
                                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                    search.alertsEnabled
                                      ? 'bg-success/10 text-success'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {search.alertsEnabled ? 'Active' : 'Paused'}
                                </button>
                                <button
                                  onClick={() => handleTestAlert(search._id!)}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                                  aria-label={`Send test alert for ${search.name}`}
                                  title="Check for due alerts"
                                  disabled={sendingAlert !== null}
                                >
                                  <Send size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSearch(search._id!)}
                                  className="p-2 text-danger hover:bg-danger/10 rounded-full transition-colors"
                                  aria-label={`Delete ${search.name} alert`}
                                  title="Delete alert"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div className="max-w-2xl">
                    <p className="text-muted-foreground mb-6">
                      Set your default search preferences. These will be used for alerts.
                    </p>

                    <div className="space-y-6">
                      {/* Price Range */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium mb-2">
                          <DollarSign size={16} />
                          Price Range
                        </label>
                        <div className="flex gap-4">
                          <input
                            type="number"
                            aria-label="Minimum monthly rent"
                            placeholder="Min"
                            min="0"
                            value={preferences.minPrice ?? ''}
                            onChange={(e) =>
                              setPreferences((p) => ({
                                ...p,
                                minPrice: e.target.value ? Number(e.target.value) : undefined,
                              }))
                            }
                            className="min-w-0 flex-1 px-3 py-2 border border-border rounded-lg bg-background"
                          />
                          <input
                            type="number"
                            aria-label="Maximum monthly rent"
                            placeholder="Max"
                            min="0"
                            value={preferences.maxPrice ?? ''}
                            onChange={(e) =>
                              setPreferences((p) => ({
                                ...p,
                                maxPrice: e.target.value ? Number(e.target.value) : undefined,
                              }))
                            }
                            className="min-w-0 flex-1 px-3 py-2 border border-border rounded-lg bg-background"
                          />
                        </div>
                      </div>

                      {/* Bedrooms */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium mb-2">
                          <Bed size={16} />
                          Bedrooms
                        </label>
                        <input
                          type="number"
                          aria-label="Minimum bedrooms"
                          placeholder="Minimum bedrooms"
                          min="0"
                          value={preferences.minBedrooms ?? ''}
                          onChange={(e) =>
                            setPreferences((p) => ({
                              ...p,
                              minBedrooms: e.target.value ? Number(e.target.value) : undefined,
                            }))
                          }
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                        />
                      </div>

                      {/* Bathrooms */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium mb-2">
                          <Bath size={16} />
                          Bathrooms
                        </label>
                        <input
                          type="number"
                          aria-label="Minimum bathrooms"
                          placeholder="Minimum bathrooms"
                          min="0"
                          step="0.5"
                          value={preferences.minBathrooms ?? ''}
                          onChange={(e) =>
                            setPreferences((p) => ({
                              ...p,
                              minBathrooms: e.target.value ? Number(e.target.value) : undefined,
                            }))
                          }
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                        />
                      </div>

                      {/* Neighborhoods */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium mb-2">
                          <MapPin size={16} />
                          Neighborhoods
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3 bg-background">
                          {[
                            'Manhattan',
                            'Brooklyn',
                            'Queens',
                            'Bronx',
                            'Staten Island',
                            'Williamsburg',
                            'Park Slope',
                            'Astoria',
                            'Long Island City',
                          ].map((neighborhood) => (
                            <label
                              key={neighborhood}
                              className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  preferences.neighborhoods?.includes(neighborhood) || false
                                }
                                onChange={(e) => {
                                  const current = preferences.neighborhoods || []
                                  if (e.target.checked) {
                                    setPreferences((p) => ({
                                      ...p,
                                      neighborhoods: [...current, neighborhood],
                                    }))
                                  } else {
                                    setPreferences((p) => ({
                                      ...p,
                                      neighborhoods: current.filter((n) => n !== neighborhood),
                                    }))
                                  }
                                }}
                                className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                              />
                              <span className="text-sm">{neighborhood}</span>
                            </label>
                          ))}
                        </div>
                        {preferences.neighborhoods && preferences.neighborhoods.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {preferences.neighborhoods.length} neighborhood
                            {preferences.neighborhoods.length !== 1 ? 's' : ''} selected
                          </p>
                        )}
                      </div>

                      {/* Pet Preferences */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium mb-2">
                          <PawPrint size={16} />
                          Pet Requirements
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={preferences.requiresDogsAllowed || false}
                              onChange={(e) =>
                                setPreferences((p) => ({
                                  ...p,
                                  requiresDogsAllowed: e.target.checked,
                                }))
                              }
                              className="rounded"
                            />
                            Dogs allowed
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={preferences.requiresCatsAllowed || false}
                              onChange={(e) =>
                                setPreferences((p) => ({
                                  ...p,
                                  requiresCatsAllowed: e.target.checked,
                                }))
                              }
                              className="rounded"
                            />
                            Cats allowed
                          </label>
                        </div>
                      </div>

                      {/* No Fee */}
                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={preferences.noFeeOnly || false}
                            onChange={(e) =>
                              setPreferences((p) => ({ ...p, noFeeOnly: e.target.checked }))
                            }
                            className="rounded"
                          />
                          No broker fee only
                        </label>
                      </div>

                      <button
                        onClick={handleSavePreferences}
                        disabled={isSaving || !preferencesLoaded}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save Preferences'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* New Search Alert Modal */}
      {showNewSearchModal && (
        <NewSearchModal
          onClose={() => setShowNewSearchModal(false)}
          onCreated={(search) => {
            setSavedSearches((prev) => [search, ...prev])
            setShowNewSearchModal(false)
          }}
        />
      )}

      <Footer />
    </div>
  )
}

function NewSearchModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (search: SavedSearch) => void
}) {
  const [name, setName] = useState('')
  const [criteria, setCriteria] = useState<UserPreferences>({})
  const [alertMethod, setAlertMethod] = useState<'email' | 'in-app' | 'both'>('email')
  const [alertFrequency, setAlertFrequency] = useState<'immediate' | 'daily' | 'weekly'>(
    'daily',
  )
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a name for this alert')
      return
    }

    setError(null)
    setIsCreating(true)
    try {
      const search = await api.createSavedSearch({
        name,
        criteria,
        alertsEnabled: true,
        alertFrequency,
        alertMethod,
      })
      onCreated(search)
    } catch (error) {
      console.error('Failed to create search:', error)
      setError(error instanceof Error ? error.message : 'Something went wrong. Please retry.')
    }
    setIsCreating(false)
  }

  return (
    <Dialog title="Create search alert" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleCreate()
        }}
        className="space-y-4"
      >
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="alert-name" className="text-sm font-medium mb-1 block">
            Alert Name
          </label>
          <input
            required
            maxLength={100}
            id="alert-name"
            type="text"
            placeholder="e.g., 2BR in Brooklyn under $3k"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="alert-price" className="text-sm font-medium mb-1 block">
              Max Price
            </label>
            <input
              min="0"
              id="alert-price"
              type="number"
              placeholder="e.g., 3000"
              value={criteria.maxPrice ?? ''}
              onChange={(e) =>
                setCriteria((c) => ({
                  ...c,
                  maxPrice: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>
          <div>
            <label htmlFor="alert-beds" className="text-sm font-medium mb-1 block">
              Min Bedrooms
            </label>
            <input
              min="0"
              id="alert-beds"
              type="number"
              placeholder="e.g., 2"
              value={criteria.minBedrooms ?? ''}
              onChange={(e) =>
                setCriteria((c) => ({
                  ...c,
                  minBedrooms: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Neighborhoods</label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3 bg-background">
            {[
              'Manhattan',
              'Brooklyn',
              'Queens',
              'Bronx',
              'Staten Island',
              'Williamsburg',
              'Park Slope',
              'Astoria',
              'Long Island City',
            ].map((neighborhood) => (
              <label
                key={neighborhood}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  checked={criteria.neighborhoods?.includes(neighborhood) || false}
                  onChange={(e) => {
                    const current = criteria.neighborhoods || []
                    if (e.target.checked) {
                      setCriteria((c) => ({
                        ...c,
                        neighborhoods: [...current, neighborhood],
                      }))
                    } else {
                      setCriteria((c) => ({
                        ...c,
                        neighborhoods: current.filter((n) => n !== neighborhood),
                      }))
                    }
                  }}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                />
                <span className="text-sm">{neighborhood}</span>
              </label>
            ))}
          </div>
          {criteria.neighborhoods && criteria.neighborhoods.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {criteria.neighborhoods.length} selected
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={criteria.requiresDogsAllowed || false}
              onChange={(e) =>
                setCriteria((c) => ({ ...c, requiresDogsAllowed: e.target.checked }))
              }
            />
            Dogs OK
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={criteria.noFeeOnly || false}
              onChange={(e) => setCriteria((c) => ({ ...c, noFeeOnly: e.target.checked }))}
            />
            No Fee
          </label>
        </div>

        <div>
          <label htmlFor="delivery-method" className="text-sm font-medium mb-1 block">
            Delivery method
          </label>
          <select
            id="delivery-method"
            value={alertMethod}
            onChange={(e) => setAlertMethod(e.target.value as 'email' | 'in-app' | 'both')}
            className="field mb-4"
          >
            <option value="email">Email</option>
            <option value="in-app">In-app notifications</option>
            <option value="both">Email and in-app</option>
          </select>
          <label htmlFor="alert-frequency" className="text-sm font-medium mb-1 block">
            Alert Frequency
          </label>
          <select
            id="alert-frequency"
            value={alertFrequency}
            onChange={(e) => setAlertFrequency(e.target.value as any)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
          >
            <option value="immediate">At the next scheduled check</option>
            <option value="daily">Daily digest</option>
            <option value="weekly">Weekly digest</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isCreating}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isCreating ? 'Creating...' : 'Create Alert'}
        </button>
      </form>
    </Dialog>
  )
}
