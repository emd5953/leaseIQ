'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, MapPin, Users, Search, Loader2, X, Scale } from 'lucide-react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import ResearchReport, { displayDate } from '@/components/research/ResearchReport'
import { api } from '@/lib/api'
import type { ResearchResult } from '@/lib/research-types'

const BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']
const examples = [{ street: '230 West 55 Street', borough: 'Manhattan' }, { street: '125 Court Street', borough: 'Brooklyn' }]
const comparisonKey = 'leaseiq-research-comparison-v2'
const reportKey = (report: ResearchResult) => report.match.buildingId || report.address.trim().toLowerCase()
export default function ResearchPage() {
  const [street, setStreet] = useState('')
  const [borough, setBorough] = useState('Manhattan')
  const [report, setReport] = useState<ResearchResult | null>(null)
  const [comparison, setComparison] = useState<ResearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const controller = useRef<AbortController | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  async function run(address = street, area = borough, listingId?: string) {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setLoading(true); setError(''); setNotice(''); setReport(null)
    try {
      const result = listingId ? await api.researchListing(listingId, undefined, request.signal) : await api.researchAddress(address, area, request.signal)
      if (request.signal.aborted) return
      setReport(result.research)
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }))
    } catch (e) {
      if (!request.signal.aborted) setError(e instanceof Error ? e.message : 'Research failed. Try again.')
    } finally { if (!request.signal.aborted) setLoading(false) }
  }
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(comparisonKey) || '[]')
      if (Array.isArray(saved)) setComparison(saved.filter(r => r?.version === 2 && typeof r.address === 'string' && Array.isArray(r.metrics) && Array.isArray(r.sections) && r.sections.every((s: any) => ['building', 'neighborhood', 'management'].includes(s?.id) && ['facts', 'analysis', 'unknowns', 'questions'].every(key => Array.isArray(s[key]))) && Array.isArray(r.sources) && Array.isArray(r.violations) && Array.isArray(r.limitations) && Array.isArray(r.resourceLinks) && r.match?.status).slice(0, 3))
    } catch { /* A blocked or outdated local store should not block research. */ }
    const params = new URLSearchParams(window.location.search)
    const listingId = params.get('listingId')
    const address = params.get('address')
    const area = params.get('borough') || 'Manhattan'
    if (address) { setStreet(address); setBorough(BOROUGHS.includes(area) ? area : 'Manhattan'); void run(address, BOROUGHS.includes(area) ? area : 'Manhattan') }
    else if (listingId && /^[a-f\d]{24}$/i.test(listingId)) void run('', '', listingId)
    return () => controller.current?.abort()
    // URL input is intentionally read once; editing the form does not run research.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  function updateComparison(next: ResearchResult[]) {
    setComparison(next)
    try { localStorage.setItem(comparisonKey, JSON.stringify(next)) } catch { setNotice('Comparison is available for this visit; browser storage is unavailable.') }
  }
  function addComparison() {
    if (!report) return
    const existing = comparison.findIndex(item => reportKey(item) === reportKey(report))
    if (existing >= 0) { updateComparison(comparison.map((item, i) => i === existing ? report : item)); setNotice('Updated the saved comparison with this report.'); return }
    if (comparison.length === 3) { setNotice('Remove a property below to compare another. You can compare up to three.'); return }
    updateComparison([...comparison, report]); setNotice('Added to your comparison below. Saved only in this browser.')
  }
  return <main className="min-h-screen">
    <Navigation />
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
      <div className="print:hidden">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="eyebrow text-primary">NYC rental research</p><h1 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">A better look <span className="italic">before the lease.</span></h1><p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground/70">Understand the building, the neighborhood, and who manages it. Start with an address. Follow the evidence.</p></div>
          <Link href="/search" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary">Browse rentals <ArrowRight size={16} /></Link>
        </div>
        <form onSubmit={e => { e.preventDefault(); void run() }} className="rounded-3xl border border-border bg-card p-5 shadow-soft-md md:p-7">
          <div className="grid items-end gap-4 md:grid-cols-[1fr_200px_auto]">
            <div><label htmlFor="research-street" className="mb-2 block text-sm font-semibold">Street address</label><div className="relative"><MapPin size={18} className="absolute left-4 top-4 text-primary" /><input id="research-street" required maxLength={160} value={street} onChange={e => setStreet(e.target.value)} placeholder="e.g. 230 West 55 Street" autoComplete="street-address" className="field pl-11" /></div></div>
            <div><label htmlFor="research-borough" className="mb-2 block text-sm font-semibold">Borough</label><select id="research-borough" className="field" value={borough} onChange={e => setBorough(e.target.value)}>{BOROUGHS.map(b => <option key={b}>{b}</option>)}</select></div>
            <button disabled={loading} type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white hover:bg-foreground disabled:opacity-60">{loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}{loading ? 'Researching…' : 'Research property'}</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-foreground/65"><span>Public records · All five boroughs · No account needed</span><span>Try {examples.map((example, i) => <span key={example.street}>{i > 0 && ' or '}<button type="button" disabled={loading} className="underline underline-offset-2 hover:text-primary" onClick={() => { setStreet(example.street); setBorough(example.borough); void run(example.street, example.borough) }}>{example.street}</button></span>)}</span></div>
        </form>
        {loading && <div role="status" className="my-8 flex items-start gap-4 rounded-2xl bg-primary/10 p-6"><Loader2 size={22} className="shrink-0 animate-spin text-primary" /><div><p className="font-semibold">Checking the address and public records</p><p className="mt-1 text-sm text-foreground/70">Each source is checked separately. This can take up to a minute; unavailable records will be clearly marked.</p></div></div>}
        {error && <div role="alert" className="my-6 rounded-2xl border border-accent/20 bg-accent/5 p-5"><p className="font-semibold">We couldn’t complete this report</p><p className="mt-1 text-sm">{error}</p><p className="mt-2 text-sm text-foreground/70">Check the address and borough, then retry. You can also verify records directly in <a href="https://hpdonline.nyc.gov/hpdonline/building/search" className="underline" target="_blank" rel="noreferrer">HPD Online</a>.</p></div>}
        {!report && !loading && <div className="my-12 grid gap-6 md:grid-cols-3">{[{ Icon: Building2, title: 'The building', text: 'Open housing violations, recorded history, and questions about repairs.' }, { Icon: MapPin, title: 'The neighborhood', text: 'Available local context, plus the commute and daily-life checks still to make.' }, { Icon: Users, title: 'The management', text: 'Registered owners and agents, with clear limits on reputation evidence.' }].map(({ Icon, title, text }, i) => <div className="border-t border-border pt-6" key={title}><div className="flex justify-between text-primary"><Icon size={24} strokeWidth={1.5} /><span className="text-xs text-foreground/40">0{i + 1}</span></div><h2 className="mt-6 font-serif text-2xl">{title}</h2><p className="mt-3 text-sm leading-relaxed text-foreground/70">{text}</p></div>)}</div>}
      </div>
      {notice && <p role="status" className="my-6 rounded-xl bg-primary/10 p-4 text-sm print:hidden">{notice}</p>}
      <div ref={resultRef} className="scroll-mt-24 pt-8">{report && <ResearchReport report={report} onCompare={addComparison} added={comparison.some(r => reportKey(r) === reportKey(report))} />}</div>
      {!!comparison.length && <section className="mt-12 rounded-3xl border border-border bg-card p-6 md:p-8 print:hidden" aria-label="Property comparison">
        <div className="flex flex-wrap justify-between gap-4"><h2 className="flex items-center gap-3 font-serif text-2xl"><Scale size={22} />Your comparison</h2><button onClick={() => updateComparison([])} className="text-sm text-foreground/65 underline">Clear comparison</button></div>
        <p className="mt-3 text-sm text-foreground/70">Up to three properties, saved in this browser. Compare source dates and building size; raw counts alone do not rank rental quality.</p>
        <div className="mt-6 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Comparison of public records for saved properties</caption><thead><tr><th className="min-w-40 p-3">Evidence</th>{comparison.map(r => <th key={r.address} className="min-w-56 p-3 align-top"><div className="flex justify-between gap-3"><span>{r.address}</span><button onClick={() => updateComparison(comparison.filter(item => item.address !== r.address))} aria-label={`Remove ${r.address}`}><X size={16} /></button></div><button onClick={() => { setReport(r); setNotice('Viewing a saved report. Run address research again for a fresh lookup.'); resultRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) }} className="mt-2 font-normal text-primary underline">View saved report</button></th>)}</tr></thead><tbody>
          <tr className="border-t border-border"><th className="p-3 font-normal text-foreground/65">Report date</th>{comparison.map(r => <td key={r.address} className="p-3">{displayDate(r.generatedAt)}</td>)}</tr>
          <tr className="border-t border-border"><th className="p-3 font-normal text-foreground/65">Address match</th>{comparison.map(r => <td key={r.address} className="p-3">{r.match.status.replace('_', ' ')}</td>)}</tr>
          {['Open HPD violations', 'Open class C', 'Total recorded violations'].map(label => <tr className="border-t border-border" key={label}><th className="p-3 font-normal text-foreground/65">{label}</th>{comparison.map(r => <td key={r.address} className="p-3 font-semibold tabular-nums">{r.metrics.find(m => m.label === label)?.value ?? 'Unknown'}</td>)}</tr>)}
          <tr className="border-t border-border"><th className="p-3 font-normal text-foreground/65">Violation dataset updated</th>{comparison.map(r => <td key={r.address} className="p-3">{displayDate(r.sources?.find(s => s.id === 'violations')?.datasetUpdatedAt)}</td>)}</tr>
          <tr className="border-t border-border"><th className="p-3 font-normal text-foreground/65">Management reputation</th>{comparison.map(r => <td key={r.address} className="p-3">Not verified</td>)}</tr>
        </tbody></table></div>
      </section>}
    </div><Footer />
  </main>
}
