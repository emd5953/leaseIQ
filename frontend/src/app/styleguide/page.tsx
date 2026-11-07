import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { ArrowUpRight, AlertTriangle, CheckCircle, Info } from 'lucide-react'
const palette = [
  ['Deep ink', '#0D1C25', 'bg-background'],
  ['Harbor', '#142936', 'bg-card'],
  ['Slate', '#1B3340', 'bg-card-alt'],
  ['Paper', '#F4F3ED', 'bg-foreground'],
  ['Sky', '#9AD7EF', 'bg-primary'],
  ['Sky hover', '#BBE6F7', 'bg-primary-hover'],
  ['Terracotta', '#FFA17E', 'bg-accent'],
  ['Hairline', 'Cream / 12%', 'bg-border'],
]
export default function StyleGuidePage() {
  return (
    <main id="main-content">
      <Navigation />
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-32 sm:px-8">
        <header className="workspace-header">
          <p className="eyebrow text-primary">LeaseIQ / Design language</p>
          <h1 className="page-title mt-4">A field guide to feeling at home.</h1>
          <p className="mt-5 max-w-xl text-muted-foreground">
            A city in motion. A practical guide beside it. Architectural forms and clear evidence
            make the LeaseIQ identity.
          </p>
        </header>
        <section className="guide-section">
          <p className="eyebrow text-primary">01 / Palette & surfaces</p>
          <h2>Ink, sky, and a little city warmth.</h2>
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
            {palette.map(([name, hex, cls]) => (
              <div key={name}>
                <div className={`h-28 rounded-xl border border-border ${cls}`} />
                <p className="mt-3 text-sm">{name}</p>
                <p className="font-mono text-xs text-muted-foreground">{hex}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Sky marks selection, focus, and primary actions. Terracotta adds warmth and identifies
            key moments. Source warnings, failures, and success use separate semantic colors and
            written labels.
          </p>
        </section>
        <section className="guide-section">
          <p className="eyebrow text-primary">02 / Typography</p>
          <h2>A voice for every layer.</h2>
          <div className="mt-8 grid items-start gap-8 md:grid-cols-2">
            <div className="surface p-6">
              <p className="eyebrow text-muted-foreground">SPACE GROTESK / 500–700</p>
              <p className="mt-6 font-heading text-5xl leading-none">
                Good places.
                <br />
                <span className="text-primary">Fewer surprises.</span>
              </p>
              <p className="mt-6 text-xs text-muted-foreground">
                Hero 48–96px · Confident, direct, and human
              </p>
            </div>
            <div className="space-y-7">
              <div>
                <p className="eyebrow text-muted-foreground">SPACE GROTESK / HEADINGS</p>
                <h3 className="mt-3 text-4xl">Look beyond the address.</h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  Page titles 32–56px · Marketing headings 36–64px
                </p>
              </div>
              <div>
                <p className="eyebrow text-muted-foreground">INTER / BODY & CONTROLS</p>
                <p className="mt-3 text-base">
                  Follow every finding back to its source. Unknown values remain unknown.
                </p>
              </div>
              <div>
                <p className="eyebrow text-muted-foreground">JETBRAINS MONO / METADATA</p>
                <p className="mt-3 font-mono text-xs">NYC / BUILDING BRIEF · SOURCE DATES</p>
              </div>
            </div>
          </div>
        </section>
        <section className="guide-section">
          <p className="eyebrow text-primary">03 / Controls</p>
          <h2>Quiet, until you need them.</h2>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link className="btn btn-primary" href="/search">
              Find a rental
              <ArrowUpRight size={16} />
            </Link>
            <Link className="btn btn-secondary" href="/research">
              Research an address
            </Link>
            <Link className="btn btn-accent" href="/shortlist">
              Open shortlist
            </Link>
            <button className="btn btn-secondary opacity-40" disabled>
              Unavailable
            </button>
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <form action="/search" className="surface p-6">
              <label htmlFor="guide-query" className="text-sm">
                Street or neighborhood
              </label>
              <input id="guide-query" name="q" className="field mt-2" placeholder="Brooklyn" />
              <label htmlFor="guide-budget" className="mt-5 block text-sm">
                Maximum monthly rent
              </label>
              <input
                type="number"
                id="guide-budget"
                name="maxPrice"
                className="field mt-2"
                placeholder="3,500"
                min="0"
              />
              <label className="mt-5 flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" name="noFee" value="true" />
                Listed no fee
              </label>
              <button className="btn btn-primary mt-4">Find rentals</button>
            </form>
            <div className="space-y-4">
              <p className="rounded-xl border border-warning/25 bg-warning/10 p-4 text-sm text-warning">
                <AlertTriangle className="mr-2 inline" size={17} />
                Not verified · confirm the exact unit.
              </p>
              <p className="rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm text-danger">
                Error · the report could not load. Retry the request.
              </p>
              <p className="rounded-xl border border-success/25 bg-success/10 p-4 text-sm text-success">
                <CheckCircle className="mr-2 inline" size={17} />
                Success · your preferences are saved.
              </p>
              <p className="rounded-xl border border-info/25 bg-info/10 p-4 text-sm text-info">
                <Info className="mr-2 inline" size={17} />
                Unknown · no reliable date was returned.
              </p>
              <p className="text-xs text-muted-foreground">
                Examples of status presentation, not live notifications.
              </p>
            </div>
          </div>
        </section>
        <section className="guide-section">
          <p className="eyebrow text-primary">04 / Dense evidence</p>
          <h2>Keep the qualifications close.</h2>
          <div className="surface mt-8 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="p-5 text-left font-mono text-[10px] text-muted-foreground">
                ILLUSTRATIVE REPORT · NOT LIVE RESULTS
              </caption>
              <thead className="border-y border-border">
                <tr>
                  {['Evidence', 'Value', 'Source status', 'Observation'].map((x) => (
                    <th key={x} className="p-5 font-medium">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Advertised unit rent', '$3,200 / month', 'Source reported', 'Oct 12, 2026'],
                  ['Open HPD violations', 'Unknown', 'Unavailable', 'Not retrieved'],
                  ['Registered owner', 'Example owner', 'Illustrative only', 'Oct 12, 2026'],
                ].map((r) => (
                  <tr key={r[0]} className="border-b border-border">
                    {r.map((v, i) => (
                      <td
                        key={i}
                        className={`p-5 ${i === 3 ? 'font-mono text-xs text-muted-foreground' : ''}`}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="guide-section">
          <p className="eyebrow text-primary">05 / Rhythm & motion</p>
          <h2>Deliberate. Never in the way.</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <dl className="divide-y divide-border">
              {[
                ['Controls', '160ms · hover and press'],
                ['Workspace', '220ms · subtle arrival'],
                ['Hero', '650ms · simple entrance'],
                ['Content', '500ms · 16px rise'],
                ['Reduced motion', 'Static poster · all content visible'],
              ].map(([a, b]) => (
                <div key={a} className="flex justify-between gap-5 py-4 text-sm">
                  <dt>{a}</dt>
                  <dd className="text-right text-muted-foreground">{b}</dd>
                </div>
              ))}
            </dl>
            <div className="surface p-6 text-sm text-muted-foreground">
              <p>
                Native scrolling, persistent video pause, and immediate workspace feedback.
                Animations enhance already available content.
              </p>
              <p className="mt-5">
                Spacing uses a 4px base with 20–72px page gutters. Marketing sections use 65–105px
                vertical space. Controls have 8px corners; surfaces 12px; media 16px. A small
                building mark connects the film, field guide, and workspace.
              </p>
              <p className="mt-5">
                Keyboard focus uses a 2px sky outline with 4px offset. Dialogs trap focus, dismiss
                with Escape, and return focus to the trigger.
              </p>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
