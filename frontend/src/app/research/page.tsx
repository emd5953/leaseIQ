'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MapPin, Search, Loader2, X, Scale } from 'lucide-react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import ResearchReport, { displayDate } from '@/components/research/ResearchReport'
import { apiJson } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useResearchLibrary, identity } from '@/lib/useResearchLibrary'
const BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']
type Suggestion = { street: string; borough: string; buildingId: string; bin: string | null }
export default function ResearchPage() {
  const { user } = useAuth()
  const library = useResearchLibrary(user?.id)
  const report = library.current?.report
  const [street, setStreet] = useState('')
  const [borough, setBorough] = useState('Manhattan')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggestionStatus, setSuggestionStatus] = useState('')
  const [suggestionSource, setSuggestionSource] = useState<any>(null)
  const [candidate, setCandidate] = useState<Suggestion | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const suggestionVersion = useRef(0)
  function choose(item: Suggestion) {
    suggestionVersion.current++
    setStreet(item.street)
    setBorough(item.borough)
    setCandidate(item)
    setConfirmed(false)
    setSuggestions([])
    setActiveSuggestion(-1)
  }
  useEffect(() => {
    const gen = ++suggestionVersion.current
    setSuggestions([])
    setActiveSuggestion(-1)
    if (candidate || !/^\d[\w-]*\s+\S{2}/.test(street.trim())) {
      setSuggestionStatus('')
      return
    }
    const request = new AbortController()
    const timer = setTimeout(async () => {
      setSuggestionStatus('Looking up HPD address candidates…')
      try {
        const data = await apiJson(
          `/api/research/suggestions?${new URLSearchParams({ street, borough })}`,
          { signal: request.signal },
        )
        if (request.signal.aborted || gen !== suggestionVersion.current) return
        setSuggestions(data.suggestions)
        setSuggestionSource(data.source)
        setSuggestionStatus(
          data.source.status === 'unavailable'
            ? 'Address suggestions are unavailable. You can still research the exact address.'
            : data.suggestions.length
              ? 'Select a candidate, then confirm the building. Suggestions are not verified matches.'
              : 'No suggestions found. Check spelling, borough, or an alternate entrance in HPD Online.',
        )
      } catch (e) {
        if (!request.signal.aborted && gen === suggestionVersion.current)
          setSuggestionStatus(
            'Suggestions are unavailable. Enter the exact address and borough to continue.',
          )
      }
    }, 400)
    return () => {
      clearTimeout(timer)
      request.abort()
    }
  }, [street, borough, candidate])
  async function run(
    address = street,
    area = borough,
    listingId?: string,
    confirmedId?: string | null,
  ) {
    if (candidate && !confirmed && !listingId && confirmedId === undefined) {
      setError(
        'Confirm the selected HPD building, or clear the suggestion to research the typed address.',
      )
      return
    }
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setLoading(true)
    setError('')
    setSuggestions([])
    try {
      const data = await apiJson(
        listingId ? `/api/research/${listingId}` : '/api/research/address',
        {
          method: 'POST',
          body: JSON.stringify({
            street: address,
            borough: area,
            ...((
              confirmedId === undefined
                ? candidate && confirmed
                  ? candidate.buildingId
                  : null
                : confirmedId
            )
              ? {
                  confirmedBuildingId:
                    confirmedId === undefined ? candidate!.buildingId : confirmedId,
                }
              : {}),
          }),
          signal: request.signal,
        },
        90000,
      )
      if (request.signal.aborted) return
      await library.remember(data.research, data.receipt)
      requestAnimationFrame(() => {
        resultRef.current?.focus()
        resultRef.current?.scrollIntoView({
          block: 'start',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
        })
      })
    } catch (e) {
      if (!request.signal.aborted) setError((e as Error).message)
    } finally {
      if (!request.signal.aborted) setLoading(false)
    }
  }
  function refreshSources() {
    if (!report) return
    const area = BOROUGHS.find((b) => report.address.endsWith(', ' + b + ', NY'))
    if (!area) {
      library.setNotice('Enter the saved report address and borough above to run a fresh lookup.')
      return
    }
    const address = report.address.slice(0, -(', ' + area + ', NY').length)
    void run(address, area, undefined, report.match.buildingId || null)
  }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search),
      address = params.get('address'),
      area = params.get('borough') || 'Manhattan',
      id = params.get('listingId')
    if (address) {
      setStreet(address)
      setBorough(BOROUGHS.includes(area) ? area : 'Manhattan')
      void run(address, BOROUGHS.includes(area) ? area : 'Manhattan')
    } else if (id && /^[a-f\d]{24}$/i.test(id)) void run('', '', id)
    return () => controller.current?.abort()
  }, [])
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
        <div className="print:hidden">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="eyebrow text-primary">NYC rental research</p>
              <h1 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
                A better look <span className="italic">before the lease.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground/70">
                Understand the building, the neighborhood, and who manages it. Start with an
                address. Follow the evidence.
              </p>
            </div>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              Browse rentals <ArrowRight size={16} />
            </Link>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void run()
            }}
            className="rounded-3xl border border-border bg-card p-5 shadow-soft-md md:p-7"
          >
            <div className="grid items-end gap-4 md:grid-cols-[1fr_200px_auto]">
              <div className="relative">
                <label htmlFor="research-street" className="mb-2 block text-sm font-semibold">
                  Street address
                </label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-4 text-primary" />
                  <input
                    id="research-street"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={suggestions.length > 0}
                    aria-controls="address-suggestions"
                    aria-activedescendant={
                      activeSuggestion >= 0 ? `suggestion-${activeSuggestion}` : undefined
                    }
                    autoComplete="off"
                    required
                    maxLength={160}
                    value={street}
                    onChange={(e) => {
                      setStreet(e.target.value)
                      setCandidate(null)
                      setConfirmed(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown' && suggestions.length) {
                        e.preventDefault()
                        setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1))
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setActiveSuggestion((i) => Math.max(i - 1, 0))
                      } else if (
                        e.key === 'Enter' &&
                        activeSuggestion >= 0 &&
                        suggestions[activeSuggestion]
                      ) {
                        e.preventDefault()
                        choose(suggestions[activeSuggestion])
                      } else if (e.key === 'Escape') {
                        setSuggestions([])
                        setActiveSuggestion(-1)
                      }
                    }}
                    placeholder="e.g. 230 West 55 Street"
                    className="field pl-11"
                  />
                </div>
                {!!suggestions.length && (
                  <ul
                    id="address-suggestions"
                    role="listbox"
                    aria-label="HPD address candidates"
                    className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-card p-2 shadow-soft"
                  >
                    {suggestions.map((s, i) => (
                      <li
                        key={s.buildingId}
                        id={`suggestion-${i}`}
                        role="option"
                        aria-selected={i === activeSuggestion}
                        className={i === activeSuggestion ? 'bg-primary/10' : ''}
                      >
                        <button
                          type="button"
                          className="w-full rounded-lg p-3 text-left text-sm hover:bg-card-alt"
                          onClick={() => choose(s)}
                        >
                          {s.street}, {s.borough}
                          <span className="block text-xs text-foreground/60">
                            HPD {s.buildingId} · BIN {s.bin || 'not reported'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label htmlFor="research-borough" className="mb-2 block text-sm font-semibold">
                  Borough
                </label>
                <select
                  id="research-borough"
                  className="field"
                  value={borough}
                  onChange={(e) => {
                    setBorough(e.target.value)
                    setCandidate(null)
                    setConfirmed(false)
                  }}
                >
                  {BOROUGHS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>
              <button
                disabled={loading}
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}{' '}
                {loading ? 'Researching…' : 'Research property'}
              </button>
            </div>
            {suggestionStatus && (
              <p role="status" className="mt-3 text-sm text-foreground/70">
                {suggestionStatus}{' '}
                {suggestionSource && (
                  <a
                    href={suggestionSource.queryUrl || suggestionSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    HPD source · retrieved {displayDate(suggestionSource.retrievedAt)}
                  </a>
                )}
              </p>
            )}
            {candidate && (
              <div className="mt-4 rounded-xl bg-amber-50 p-4">
                <label className="flex gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I confirm {candidate.street}, {candidate.borough} — HPD building{' '}
                  {candidate.buildingId} is the building I intend to research.
                </label>
                <button
                  type="button"
                  className="mt-3 text-sm underline"
                  onClick={() => {
                    setCandidate(null)
                    setConfirmed(false)
                  }}
                >
                  Clear suggestion
                </button>
              </div>
            )}
            <p className="mt-4 text-xs text-foreground/65">
              Public records · All five boroughs · No account needed · HPD coverage is incomplete.
              An unknown match never attaches another building’s records.
            </p>
          </form>
          {loading && (
            <div role="status" className="my-8 rounded-2xl bg-primary/10 p-6">
              Checking the building and public sources. Unavailable sources will be identified
              individually.
            </div>
          )}
          {error && (
            <div role="alert" className="my-6 rounded-2xl border border-accent/20 bg-accent/5 p-5">
              <p>{error}</p>
              <button onClick={() => run()} className="mt-3 underline">
                Retry research
              </button>
            </div>
          )}
          {library.notice && (
            <p role="status" className="my-5 rounded-xl bg-primary/10 p-4 text-sm">
              {library.notice}
            </p>
          )}
          <section
            aria-label="Research history"
            className="mt-6 rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <h2 className="font-serif text-xl">
                {user ? 'Your account research' : 'Browser research history'}
              </h2>
              {user && (
                <div className="flex gap-4 text-sm">
                  <button onClick={() => library.reload()} className="underline">
                    Retry account sync
                  </button>
                  <button
                    disabled={library.busy}
                    onClick={() => library.syncBrowser()}
                    className="underline"
                  >
                    Sync browser history
                  </button>
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-foreground/60">
              {user
                ? 'Private to your account until you create a share link.'
                : 'Anonymous history and comparisons stay in this browser. Sign in to sync them.'}
            </p>
            {!!library.history.length && (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {library.history.map((item) => (
                  <li key={item._id || item.report.address + item.report.generatedAt}>
                    <button
                      onClick={() => library.view(item)}
                      className="w-full rounded-xl bg-card-alt p-3 text-left text-sm"
                    >
                      <span className="font-semibold">{item.report.address}</span>
                      <span className="block text-xs text-foreground/60">
                        Snapshot {displayDate(item.report.generatedAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {library.next && (
              <button onClick={() => library.moreHistory()} className="mt-4 underline">
                Load older research
              </button>
            )}
          </section>
        </div>
        <div ref={resultRef} tabIndex={-1} className="scroll-mt-24 pt-8">
          {report && (
            <>
              {report.match.status !== 'matched' && (
                <aside role="status" className="mb-5 rounded-xl bg-amber-50 p-5">
                  <h2 className="font-semibold">
                    Confirm the address before relying on building records
                  </h2>
                  <p className="mt-2">{report.match.explanation}</p>
                  <p className="mt-2">
                    Try the street spelling used by HPD, check the borough, or verify an alternate
                    entrance in{' '}
                    <a
                      href="https://hpdonline.nyc.gov/hpdonline/building/search"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      HPD Online
                    </a>
                    . Edit the address above and run a new lookup.
                  </p>
                </aside>
              )}
              {report.sources.some((s) => s.status === 'unavailable') && (
                <aside role="status" className="mb-5 rounded-xl bg-amber-50 p-5">
                  Partial source coverage:{' '}
                  {report.sources
                    .filter((s) => s.status === 'unavailable')
                    .map((s) => s.name)
                    .join(', ')}{' '}
                  unavailable. Available evidence is retained.{' '}
                  <button onClick={refreshSources} className="underline">
                    Retry sources with a fresh lookup
                  </button>
                </aside>
              )}
              <ResearchReport
                report={report}
                onCompare={() => library.addComparison()}
                added={library.comparison.some((x) => identity(x.report) === identity(report))}
              />
              <section
                className="mt-5 rounded-2xl border border-border bg-card p-5 print:hidden"
                aria-label="Share report snapshot"
              >
                <h2 className="font-serif text-xl">Share this snapshot</h2>
                <p className="mt-2 text-sm">
                  Captured {new Date(report.generatedAt).toLocaleString()} ·{' '}
                  {Math.max(
                    0,
                    Math.floor((Date.now() - Date.parse(report.generatedAt)) / 86400000),
                  )}{' '}
                  days old. This snapshot does not update when sources change. Anyone with a share
                  link can read its public-record evidence until you revoke access.
                </p>
                {user ? (
                  <div className="mt-4 flex flex-wrap gap-4">
                    <button
                      disabled={library.busy}
                      onClick={() => library.share()}
                      className="rounded-full bg-foreground px-5 py-2 text-background"
                    >
                      Create share link
                    </button>
                    {!library.current?._id && (
                      <button
                        onClick={() => library.remember(report, library.current?.receipt)}
                        className="underline"
                      >
                        Retry save
                      </button>
                    )}
                    {library.current?.sharedAt && (
                      <button onClick={() => library.revoke()} className="underline">
                        Revoke sharing
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm">Sign in to create a share link.</p>
                )}
                {library.shareUrl && (
                  <label className="mt-4 block text-sm">
                    Share link
                    <input
                      readOnly
                      value={library.shareUrl}
                      onFocus={(e) => e.target.select()}
                      className="field mt-2"
                    />
                  </label>
                )}
              </section>
            </>
          )}
        </div>
        {!!library.comparison.length && (
          <section
            className="mt-12 rounded-3xl border border-border bg-card p-6 md:p-8 print:hidden"
            aria-label="Property comparison"
          >
            <div className="flex flex-wrap justify-between gap-4">
              <h2 className="flex items-center gap-3 font-serif text-2xl">
                <Scale size={22} />
                Your comparison
              </h2>
              <button
                disabled={library.busy}
                onClick={() => library.updateComparison([])}
                className="text-sm underline"
              >
                Clear comparison
              </button>
            </div>
            <p className="mt-3 text-sm text-foreground/70">
              Up to three properties, {user ? 'synced to your account' : 'saved in this browser'}.
              Compare source dates and building size; raw counts alone do not rank rental quality.
            </p>
            <div className="mt-6 overflow-x-auto" tabIndex={0} aria-label="Scrollable comparison">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Comparison of public records for saved properties
                </caption>
                <thead>
                  <tr>
                    <th className="min-w-40 p-3">Evidence</th>
                    {library.comparison.map((item, i) => (
                      <th key={identity(item.report)} className="min-w-56 p-3 align-top">
                        <div className="flex justify-between gap-3">
                          <span>{item.report.address}</span>
                          <button
                            disabled={library.busy}
                            onClick={() =>
                              library.updateComparison(library.comparison.filter((_, j) => j !== i))
                            }
                            aria-label={`Remove ${item.report.address}`}
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <button
                          onClick={() => library.view(item)}
                          className="mt-2 font-normal text-primary underline"
                        >
                          View saved report
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    'Report date',
                    'Address match',
                    'Open HPD violations',
                    'Open class C',
                    'Total recorded violations',
                    'Violation dataset updated',
                  ].map((label) => (
                    <tr key={label} className="border-t border-border">
                      <th className="p-3 font-normal text-foreground/65">{label}</th>
                      {library.comparison.map(({ report: r }) => (
                        <td key={identity(r)} className="p-3">
                          {label === 'Report date'
                            ? displayDate(r.generatedAt)
                            : label === 'Address match'
                              ? r.match.status.replace('_', ' ')
                              : label === 'Violation dataset updated'
                                ? displayDate(
                                    r.sources.find((s) => s.id === 'violations')?.datasetUpdatedAt,
                                  )
                                : (r.metrics.find((m) => m.label === label)?.value ?? 'Unknown')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
      <Footer />
    </main>
  )
}
