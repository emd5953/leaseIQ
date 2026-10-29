'use client'
import { useEffect, useRef, useState } from 'react'
import { apiJson } from './api'
import type { ResearchResult } from './research-types'
export interface StoredReport {
  _id?: string
  report: ResearchResult
  receipt?: string
  sharedAt?: string
}
const historyKey = 'leaseiq-research-history-v3'
const comparisonKey = 'leaseiq-research-comparison-v3'
export const identity = (r: ResearchResult) => r.match.buildingId || r.address.toLowerCase()
const valid = (x: any): x is StoredReport => {
  const r = x?.report
  return (
    r?.version === 2 &&
    typeof r.address === 'string' &&
    typeof r.generatedAt === 'string' &&
    typeof r.summary === 'string' &&
    ['matched', 'not_found', 'ambiguous', 'unavailable'].includes(r.match?.status) &&
    ['sections', 'sources', 'metrics', 'violations', 'limitations', 'resourceLinks'].every((key) =>
      Array.isArray(r[key]),
    ) &&
    r.sections.every(
      (s: any) =>
        s && ['facts', 'analysis', 'unknowns', 'questions'].every((key) => Array.isArray(s[key])),
    )
  )
}
function read(key: string): StoredReport[] {
  try {
    const stored = localStorage.getItem(key)
    const legacy = stored === null && key === comparisonKey
    const data = JSON.parse(
      stored || (legacy ? localStorage.getItem('leaseiq-research-comparison-v2') : null) || '[]',
    )
    return Array.isArray(data)
      ? (legacy ? data.map((report) => ({ report })) : data).filter(valid)
      : []
  } catch {
    return []
  }
}

export function useResearchLibrary(userId?: string) {
  const [history, setHistory] = useState<StoredReport[]>([])
  const [comparison, setComparison] = useState<StoredReport[]>([])
  const [current, setCurrent] = useState<StoredReport | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [next, setNext] = useState<string | null>(null)
  const generation = useRef(0)
  const idRef = useRef(userId)
  idRef.current = userId
  const write = (key: string, data: StoredReport[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch {
      setNotice('Browser storage is unavailable. Reports remain available during this visit.')
    }
  }
  async function load() {
    const gen = ++generation.current
    setReady(false)
    setBusy(false)
    setNext(null)
    setShareUrl('')
    setCurrent(null)
    setHistory([])
    setComparison([])
    try {
      if (userId) {
        const [h, c] = await Promise.all([
          apiJson('/api/research-library/history'),
          apiJson('/api/research-library/comparison'),
        ])
        if (gen !== generation.current) return
        setHistory(h.snapshots)
        setNext(h.next)
        setComparison(c.snapshots)
      } else {
        setHistory(read(historyKey))
        setComparison(read(comparisonKey).slice(0, 3))
      }
      if (gen === generation.current) setReady(true)
    } catch (e) {
      if (gen === generation.current)
        setNotice(`Account research could not load: ${(e as Error).message} Retry account sync.`)
    }
  }
  useEffect(() => {
    void load()
    return () => {
      generation.current++
    }
  }, [userId])
  async function save(item: StoredReport): Promise<StoredReport> {
    if (!idRef.current || item._id) return item
    if (!item.receipt) throw new Error('Run a fresh lookup to sync this older browser report.')
    return apiJson('/api/research-library/snapshots', {
      method: 'POST',
      body: JSON.stringify({ report: item.report, receipt: item.receipt }),
    })
  }
  async function remember(report: ResearchResult, receipt?: string) {
    const gen = generation.current
    const item = { report, receipt }
    setCurrent(item)
    setShareUrl('')
    try {
      const saved = await save(item)
      if (gen !== generation.current) return
      setCurrent(saved)
      setHistory((previous) => {
        const updated = [
          saved,
          ...previous.filter(
            (x) =>
              x.report.generatedAt !== report.generatedAt || x.report.address !== report.address,
          ),
        ].slice(0, 50)
        if (!idRef.current) write(historyKey, updated.slice(0, 20))
        return updated
      })
      setNotice(
        idRef.current
          ? 'Report saved to your account.'
          : 'Report saved in this browser. Sign in to sync research and comparisons.',
      )
    } catch (e) {
      if (gen === generation.current)
        setNotice(`Report not synced: ${(e as Error).message} Use Retry save.`)
    }
  }
  async function updateComparison(items: StoredReport[]) {
    if (busy) return
    if (userId && !ready) {
      setNotice('Load your account comparison before changing it. Retry account sync.')
      return
    }
    setBusy(true)
    const gen = generation.current
    try {
      const saved = await Promise.all(items.map(save))
      if (gen !== generation.current) return
      if (userId)
        await apiJson('/api/research-library/comparison', {
          method: 'PUT',
          body: JSON.stringify({ snapshotIds: saved.map((x) => x._id) }),
        })
      else write(comparisonKey, saved)
      if (gen === generation.current) {
        setComparison(saved)
        setNotice(
          userId ? 'Comparison synced to your account.' : 'Comparison saved in this browser.',
        )
      }
    } catch (e) {
      if (gen === generation.current)
        setNotice(`Comparison was not saved: ${(e as Error).message} Retry your change.`)
    } finally {
      if (gen === generation.current) setBusy(false)
    }
  }
  async function addComparison() {
    if (!current) return
    const index = comparison.findIndex((x) => identity(x.report) === identity(current.report))
    if (index < 0 && comparison.length >= 3) {
      setNotice('Remove a property before adding another. Compare up to three.')
      return
    }
    await updateComparison(
      index < 0 ? [...comparison, current] : comparison.map((x, i) => (i === index ? current : x)),
    )
  }
  async function share() {
    if (!current || !userId || busy) return
    setBusy(true)
    const gen = generation.current
    try {
      const saved = await save(current)
      const result = await apiJson(`/api/research-library/snapshots/${saved._id}/share`, {
        method: 'POST',
        body: JSON.stringify({ enabled: true }),
      })
      if (gen !== generation.current) return
      setCurrent({ ...saved, sharedAt: result.sharedAt })
      setShareUrl(window.location.origin + result.path)
      setHistory((old) =>
        old.map((x) => (x._id === saved._id ? { ...x, sharedAt: result.sharedAt } : x)),
      )
      setNotice(
        'Sharing enabled. Anyone with this link can read this snapshot until you revoke it. This replaces any previous link for this snapshot.',
      )
    } catch (e) {
      if (gen === generation.current) setNotice(`Sharing failed: ${(e as Error).message}`)
    } finally {
      if (gen === generation.current) setBusy(false)
    }
  }
  async function revoke() {
    if (!current?._id) return
    const gen = generation.current
    try {
      await apiJson(`/api/research-library/snapshots/${current._id}/share`, { method: 'DELETE' })
      if (gen !== generation.current) return
      setCurrent({ ...current, sharedAt: undefined })
      setShareUrl('')
      setNotice('Sharing revoked. Previous links no longer work.')
      setHistory((old) =>
        old.map((x) => (x._id === current._id ? { ...x, sharedAt: undefined } : x)),
      )
    } catch (e) {
      if (gen === generation.current) setNotice(`Could not revoke sharing: ${(e as Error).message}`)
    }
  }
  async function syncBrowser() {
    if (!userId) return
    setBusy(true)
    try {
      for (const item of read(historyKey)) await save(item)
      await load()
      setNotice('Browser history synced. Add reports to your account comparison as needed.')
    } catch (e) {
      setNotice(
        `Some browser reports could not sync: ${(e as Error).message} Your browser copies are preserved.`,
      )
    } finally {
      setBusy(false)
    }
  }
  async function moreHistory() {
    if (!next) return
    const gen = generation.current
    try {
      const data = await apiJson(`/api/research-library/history?before=${next}`)
      if (gen !== generation.current) return
      setHistory((old) => [...old, ...data.snapshots])
      setNext(data.next)
    } catch (e) {
      setNotice((e as Error).message)
    }
  }
  return {
    history,
    comparison,
    current,
    notice,
    setNotice,
    busy,
    ready,
    shareUrl,
    next,
    remember,
    addComparison,
    updateComparison,
    share,
    revoke,
    syncBrowser,
    moreHistory,
    reload: load,
    view: (item: StoredReport) => {
      setCurrent(item)
      setShareUrl('')
      setNotice('Viewing a saved snapshot. Run a fresh lookup to check current source data.')
    },
  }
}
