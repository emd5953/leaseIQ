'use client'
import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useAuth } from './AuthContext'
import { api } from '@/lib/api'

const KEY = 'leaseiq-shortlist-v1'
const COMPARE = 'leaseiq-compare-v1'
export function readIds(value: string | null, limit = 50): string[] {
  try { const data = JSON.parse(value || '[]'); return Array.isArray(data) ? [...new Set(data.filter((id): id is string => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)))].slice(0, limit) : [] } catch { return [] }
}
interface ShortlistState {
  saved: string[]; compared: string[]; ready: boolean; notice: string;
  toggleSaved: (id: string) => Promise<void>; toggleCompared: (id: string) => void;
  clearCompared: () => void; retry: () => void;
}
const Context = createContext<ShortlistState | null>(null)
export function ShortlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [saved, setSaved] = useState<string[]>([])
  const [compared, setCompared] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const generation = useRef(0)
  useEffect(() => {
    let active = true
    generation.current++
    setNotice('')
    setReady(false); setSaved([])
    if (user) api.getSavedListings().then(rows => { if (active) { setSaved(rows.map((row: any) => row._id).filter(Boolean)); setReady(true) } }).catch(() => { if (active) setNotice('Your saved rentals could not load. Retry to make changes.') })
    else { try { setSaved(readIds(localStorage.getItem(KEY))) } catch { setNotice('Browser storage is unavailable. Saves will last for this visit.') } setReady(true) }
    return () => { active = false }
  }, [user, revision])
  useEffect(() => { try { setCompared(readIds(localStorage.getItem(COMPARE), 3)) } catch {} }, [])
  function persist(key: string, ids: string[]) { try { localStorage.setItem(key, JSON.stringify(ids)) } catch { setNotice('Browser storage is unavailable. Changes will last for this visit.') } }
  async function toggleSaved(id: string) {
    if (!ready) throw new Error('Saved rentals are still loading. Please retry.')
    const session = generation.current
    const exists = saved.includes(id)
    if (!exists && saved.length >= 50) throw new Error('Your shortlist is full. Remove a rental before adding another.')
    if (user) { if (exists) await api.unsaveListing(id); else await api.saveListing(id) }
    if (session !== generation.current) return
    setNotice('')
    setSaved(current => { const next = exists ? current.filter(x => x !== id) : [...new Set([...current, id])]; if (!user) persist(KEY, next); return next })
  }
  function toggleCompared(id: string) {
    if (!compared.includes(id) && compared.length >= 3) { setNotice('Compare up to three rentals. Remove one to add another.'); return }
    const next = compared.includes(id) ? compared.filter(x => x !== id) : [...compared, id]
    setNotice(''); persist(COMPARE, next); setCompared(next)
  }
  return <Context.Provider value={{ saved, compared, ready, notice, toggleSaved, toggleCompared, clearCompared: () => { persist(COMPARE, []); setCompared([]) }, retry: () => setRevision(v => v + 1) }}>{children}</Context.Provider>
}
export function useShortlist() {
  const state = useContext(Context)
  if (!state) throw new Error('ShortlistProvider is required')
  return state
}
