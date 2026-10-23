'use client'
import { useState } from 'react'
import { SlidersHorizontal, Search, Bell, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
export const emptyFilters = { q: '', minPrice: '', maxPrice: '', bedrooms: '', bathrooms: '', neighborhoods: [] as string[], petsAllowed: false, noFee: false }
export type RentalFilters = typeof emptyFilters
export default function SearchFilters({ value, onApplyFilters }: { value: RentalFilters; onApplyFilters: (filters: RentalFilters) => void }) {
  const { user } = useAuth()
  const [draft, setDraft] = useState(value)
  const [expanded, setExpanded] = useState(false)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const count = [draft.minPrice || draft.maxPrice, draft.bedrooms, draft.bathrooms, draft.neighborhoods.length, draft.petsAllowed, draft.noFee].filter(v => v !== '' && v !== false && v !== 0).length
  const valid = () => !(draft.minPrice && draft.maxPrice && Number(draft.minPrice) > Number(draft.maxPrice))
  async function saveAlert() {
    if (!valid()) { setMessage('Minimum rent must be below maximum rent.'); return }
    if (draft.q.trim()) { setMessage('Alerts use the filters below. Clear address text before saving an alert.'); return }
    if (!name.trim()) { setMessage('Give your alert a name.'); return }
    setSaving(true)
    try { await api.createSavedSearch({ name: name.trim(), criteria: { minPrice: draft.minPrice ? Number(draft.minPrice) : null, maxPrice: draft.maxPrice ? Number(draft.maxPrice) : null, minBedrooms: draft.bedrooms !== '' ? Number(draft.bedrooms) : null, maxBedrooms: draft.bedrooms !== '' && Number(draft.bedrooms) < 3 ? Number(draft.bedrooms) : null, minBathrooms: draft.bathrooms ? Number(draft.bathrooms) : null, neighborhoods: draft.neighborhoods, noFeeOnly: draft.noFee, requiresDogsAllowed: draft.petsAllowed }, alertsEnabled: true, alertFrequency: 'daily', alertMethod: 'email' }); setMessage('Daily alert saved. Manage it in your dashboard.'); setName('') } catch { setMessage('Could not save your alert. Please retry.') } finally { setSaving(false) }
  }
  return <form onSubmit={e => { e.preventDefault(); if (!valid()) { setMessage('Minimum rent must be below maximum rent.'); return } setMessage(''); onApplyFilters(draft); setExpanded(false) }} className="rounded-2xl border border-border bg-card p-3 shadow-soft md:p-4">
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-48 flex-1"><Search size={19} className="pointer-events-none absolute left-4 top-3.5 text-primary" /><label htmlFor="rental-query" className="sr-only">Address or area</label><input id="rental-query" value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} placeholder="A street. A neighborhood. Your next home." className="field border-transparent bg-card-alt pl-11" maxLength={160} /></div>
      <button type="button" aria-expanded={expanded} aria-controls="rental-filters" onClick={() => setExpanded(!expanded)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium"><SlidersHorizontal size={16} />Filters{count > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-white">{count}</span>}<ChevronDown size={14} className={expanded ? 'rotate-180' : ''} /></button>
      <button className="pressable min-h-12 rounded-xl bg-primary px-6 text-sm font-semibold text-white hover:bg-foreground" type="submit">Find rentals</button>
    </div>
    <div id="rental-filters" hidden={!expanded} className="mt-4 border-t border-border px-2 pb-2 pt-5">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <fieldset><legend className="mb-2 text-sm font-medium">Monthly unit rent</legend><div className="flex gap-2"><input aria-label="Minimum monthly rent" type="number" min="0" max="1000000" placeholder="Min $" className="field px-3" value={draft.minPrice} onChange={e => setDraft({ ...draft, minPrice: e.target.value })} /><input aria-label="Maximum monthly rent" type="number" min="0" max="1000000" placeholder="Max $" className="field px-3" value={draft.maxPrice} onChange={e => setDraft({ ...draft, maxPrice: e.target.value })} /></div></fieldset>
        <label className="text-sm font-medium">Bedrooms<select className="field mt-2" value={draft.bedrooms} onChange={e => setDraft({ ...draft, bedrooms: e.target.value })}><option value="">Any</option><option value="0">Studio</option><option value="1">1 bed</option><option value="2">2 beds</option><option value="3">3+ beds</option></select></label>
        <label className="text-sm font-medium">Minimum bathrooms<select className="field mt-2" value={draft.bathrooms} onChange={e => setDraft({ ...draft, bathrooms: e.target.value })}><option value="">Any</option><option value="1">1 bath</option><option value="2">2 baths</option><option value="3">3+ baths</option></select></label>
        <div className="flex flex-col justify-center gap-3 text-sm"><label className="flex min-h-8 items-center gap-2"><input type="checkbox" checked={draft.petsAllowed} onChange={e => setDraft({ ...draft, petsAllowed: e.target.checked })} />Pets allowed</label><label className="flex min-h-8 items-center gap-2"><input type="checkbox" checked={draft.noFee} onChange={e => setDraft({ ...draft, noFee: e.target.checked })} />Listed no fee</label></div>
      </div>
      <fieldset className="mt-5"><legend className="mb-2 text-sm font-medium">Boroughs</legend><div className="flex flex-wrap gap-2">{['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'].map(b => <label key={b} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm ${draft.neighborhoods.includes(b) ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}><input type="checkbox" checked={draft.neighborhoods.includes(b)} onChange={e => setDraft({ ...draft, neighborhoods: e.target.checked ? [...draft.neighborhoods, b] : draft.neighborhoods.filter(x => x !== b) })} />{b}</label>)}</div></fieldset>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-xs text-foreground/60">Budget filters include known monthly unit rents. Building ranges and unknown rents remain in unfiltered results.</p><button type="button" onClick={() => { setDraft(emptyFilters); onApplyFilters(emptyFilters); setMessage('') }} className="min-h-11 text-sm text-primary underline underline-offset-4">Reset filters</button></div>
      {user && <details className="mt-4 border-t border-border pt-4"><summary className="cursor-pointer text-sm font-medium">Save a daily email alert</summary><div className="mt-3 flex flex-wrap gap-3"><input aria-label="Alert name" value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="Name your search" className="field max-w-sm" /><button type="button" disabled={saving} onClick={saveAlert} className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary"><Bell size={16} />{saving ? 'Saving…' : 'Save alert'}</button></div>{draft.petsAllowed && <p className="mt-2 text-xs">Pet alerts match listings that explicitly allow dogs.</p>}</details>}
    </div>
    {message && <p role="status" className="px-3 pt-3 text-sm text-accent">{message}</p>}
  </form>
}
