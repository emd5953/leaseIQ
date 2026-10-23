'use client'
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useShortlist } from '@/contexts/ShortlistContext'
export default function SaveButton({ id, title, compact = false }: { id: string; title: string; compact?: boolean }) {
  const { saved, ready, toggleSaved } = useShortlist()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selected = saved.includes(id)
  return <span className="relative inline-flex"><button disabled={busy || !ready} aria-label={`${selected ? 'Unsave' : 'Save'} ${title}`} aria-pressed={selected} onClick={async () => { setBusy(true); setError(''); try { await toggleSaved(id) } catch (e) { setError((e as Error).message || 'Could not save. Retry.') } finally { setBusy(false) } }} className={`pressable flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-border bg-card/95 shadow-sm disabled:opacity-50 ${compact ? 'p-3' : 'px-4 py-2 text-sm'}`}><Heart size={17} fill={selected ? 'currentColor' : 'none'} className={selected ? 'text-accent' : ''} />{!compact && (busy ? 'Saving…' : selected ? 'Saved' : 'Save')}</button>{error && <span role="alert" className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-accent/30 bg-card p-3 text-xs text-accent shadow-soft-lg">{error}</span>}</span>
}
