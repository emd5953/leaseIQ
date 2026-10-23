'use client'
import { ArrowUpRight, Building2, MapPin, Users, FileText, HelpCircle, Check, Printer, Plus } from 'lucide-react'
import type { ResearchResult } from '@/lib/research-types'

export function displayDate(value: string | null | undefined) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'Not reported'
}
const icons = { building: Building2, neighborhood: MapPin, management: Users }
export default function ResearchReport({ report, onCompare, added }: { report: ResearchResult; onCompare: () => void; added: boolean }) {
  return <article className="report space-y-7" aria-label="Property research report">
    <header className="rounded-3xl bg-foreground p-7 text-background md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="eyebrow text-background/70">Your property brief</p>
        <span className="rounded-full border border-white/25 px-3 py-1 text-xs">{report.match.status === 'matched' ? 'Building matched' : 'Match needs attention'}</span>
      </div>
      <h2 className="mt-5 font-serif text-3xl leading-tight md:text-4xl">{report.address}</h2>
      <p className="mt-4 max-w-3xl leading-relaxed text-background/85">{report.summary}</p>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/20 pt-5">
        <p className="text-sm text-background/65">Report generated {displayDate(report.generatedAt)} · NYC public records</p>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button onClick={onCompare} className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60">{added ? <Check size={15} /> : <Plus size={15} />}{added ? 'Update comparison' : 'Add to comparison'}</button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm"><Printer size={15} />Print / save PDF</button>
        </div>
      </div>
    </header>

    <details className="rounded-2xl border border-border bg-card p-5">
      <summary className="cursor-pointer text-sm font-semibold">Address match & scope {report.match.buildingId ? `· HPD ${report.match.buildingId}` : ''}</summary>
      <p className="mt-3 text-sm leading-relaxed text-foreground/75">{report.match.explanation}</p>
      {report.match.matchedAddress && <p className="mt-2 text-sm">Matched record: {report.match.matchedAddress} · BBL {report.match.bbl}</p>}
    </details>

    {!!report.metrics.length && <div className="grid gap-4 sm:grid-cols-3">{report.metrics.map(metric => <div key={metric.label} className="rounded-2xl border border-border bg-card p-6">
      <p className="text-sm font-medium text-foreground/75">{metric.label}</p>
      <p className="my-3 font-serif text-4xl tabular-nums">{metric.value === null ? 'Unknown' : metric.value.toLocaleString()}</p>
      <p className="text-xs leading-relaxed text-foreground/65">{metric.detail}</p>
      <a href={`#source-${metric.sourceIds[0]}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">View source & date <ArrowUpRight size={12} /></a>
    </div>)}</div>}

    <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl bg-card-alt px-5 py-3 text-xs text-foreground/75">
      <span><strong className="text-primary">Source facts</strong> · what records say</span>
      <span><strong className="text-foreground">Analysis</strong> · what to consider</span>
      <span><strong className="text-accent">Not verified</strong> · what is still missing</span>
    </div>
    <nav aria-label="Report sections" className="flex flex-wrap gap-2 print:hidden">{report.sections.map(section => <a className="rounded-full border border-border px-4 py-2 text-sm hover:bg-card" href={`#${section.id}`} key={section.id}>{section.id === 'management' ? 'Property management' : section.id === 'building' ? 'Building' : 'Neighborhood'}</a>)}<a href="#report-sources" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-card">Sources</a></nav>

    {report.sections.map(section => {
      const Icon = icons[section.id]
      return <section id={section.id} key={section.id} className="scroll-mt-28 rounded-3xl border border-border bg-card p-6 md:p-8">
        <h3 className="flex items-center gap-3 font-serif text-2xl"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Icon size={21} strokeWidth={1.6} /></span>{section.title}</h3>
        <div className="mt-7 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h4 className="eyebrow text-primary">Source facts</h4>
            {section.facts.length ? <dl className="mt-3 divide-y divide-border">{section.facts.map((fact, i) => <div key={`${fact.label}-${i}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><dt className="text-foreground/70">{fact.label}</dt><dd className="max-w-full break-words font-semibold">{fact.value} {fact.sourceIds.map(id => <a key={id} href={`#source-${id}`} aria-label={`Source for ${fact.label}: ${id}`} className="ml-1 inline-block text-[10px] font-normal text-primary underline">[{id}]</a>)}</dd></div>)}</dl> : <p className="mt-3 text-sm leading-relaxed text-foreground/65">No verified facts are available in this section yet.</p>}
            {section.analysis.length > 0 && <div className="mt-6"><h4 className="eyebrow">Analysis</h4>{section.analysis.map(text => <p key={text} className="mt-3 text-sm leading-relaxed text-foreground/75">{text}</p>)}</div>}
          </div>
          <div className="space-y-5">
            <div className="rounded-2xl bg-amber-50/70 p-5"><h4 className="flex items-center gap-2 text-sm font-semibold text-amber-900"><HelpCircle size={16} />Not verified</h4><ul className="mt-3 space-y-2 text-sm leading-relaxed text-amber-950/75">{section.unknowns.map(text => <li key={text}>{text}</li>)}</ul></div>
            <div><h4 className="eyebrow text-primary">Before you sign</h4><ul className="mt-3 space-y-3">{section.questions.map(text => <li key={text} className="flex gap-3 text-sm leading-relaxed"><span className="mt-1 h-3.5 w-3.5 shrink-0 rounded border border-primary/40" aria-hidden="true" />{text}</li>)}</ul></div>
          </div>
        </div>
      </section>
    })}

    {!!report.violations.length && <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
      <h3 className="font-serif text-2xl">Recent violation records</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/65">Latest {report.violations.length} records retrieved, ordered by issue date. Counts above cover all available dates. Records can concern other apartments or common areas.</p>
      <div className="mt-5 divide-y divide-border">{report.violations.map(v => <details key={v.id} className="py-4"><summary className="cursor-pointer text-sm"><span className="mr-3 inline-block rounded-md bg-card-alt px-2 py-1 font-semibold">Class {v.class}</span><span className="mr-3 font-semibold">{v.status}</span><span className="text-foreground/65">Issued {displayDate(v.issuedAt)} · #{v.id}</span></summary><p className="mt-3 text-sm leading-relaxed text-foreground/80">{v.description}</p><p className="mt-2 text-xs text-foreground/65">Status date: {displayDate(v.statusAt)} · {v.apartment ? `Apartment ${v.apartment}` : 'Apartment not specified'} · <a href="#report-sources" className="underline">HPD violation records</a></p></details>)}</div>
    </section>}

    <section id="report-sources" className="scroll-mt-28 rounded-3xl border border-border bg-card p-6 md:p-8">
      <h3 className="flex items-center gap-3 font-serif text-2xl"><FileText size={22} />Evidence & source dates</h3>
      <p className="mt-3 text-sm text-foreground/70">A recent lookup can return older data. “Dataset updated” is the publisher’s timestamp for the whole dataset, not an inspection date.</p>
      <div className="mt-6 divide-y divide-border">{report.sources.map(source => <div key={source.id} id={`source-${source.id}`} className="scroll-mt-28 py-5 first:pt-0">
        <div className="flex flex-wrap items-center justify-between gap-3"><a href={source.queryUrl || source.url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">{source.name} <ArrowUpRight size={14} className="inline" /></a><span className={`rounded-full px-3 py-1 text-xs ${source.status === 'available' ? 'bg-primary/10 text-primary' : 'bg-amber-50 text-amber-900'}`}>{source.status.replace('_', ' ')}</span></div>
        <p className="mt-2 text-xs text-foreground/65">{source.status === 'not_checked' ? 'Not retrieved' : `Retrieved ${displayDate(source.retrievedAt)}`} · Dataset updated {displayDate(source.datasetUpdatedAt)}</p>
        <p className="mt-2 text-sm text-foreground/70">{source.detail}</p>
      </div>)}</div>
    </section>
    <section className="grid gap-6 rounded-3xl bg-card-alt p-6 md:grid-cols-2 md:p-8">
      <div><h3 className="font-semibold">Keep researching</h3><div className="mt-4 space-y-3">{report.resourceLinks.map(link => <a className="flex items-center justify-between gap-4 text-sm text-primary hover:underline" href={link.url} key={link.url} target="_blank" rel="noreferrer">{link.name}<ArrowUpRight size={15} className="shrink-0" /></a>)}</div><p className="mt-4 text-xs text-foreground/60">These are follow-up resources, not evidence retrieved for this report.</p></div>
      <div><h3 className="font-semibold">Report limitations</h3><ul className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/70">{report.limitations.map(text => <li key={text}>{text}</li>)}</ul></div>
    </section>
  </article>
}
