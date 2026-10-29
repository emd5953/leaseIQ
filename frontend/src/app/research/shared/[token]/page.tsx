'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import ResearchReport from '@/components/research/ResearchReport'
import { apiJson } from '@/lib/api'
export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>()
  const [snapshot, setSnapshot] = useState<any>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    apiJson(`/api/research-library/shared/${token}`)
      .then(setSnapshot)
      .catch((e) => setError(e.message))
  }, [token])
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-32">
        {error ? (
          <p role="alert" className="rounded-xl bg-amber-50 p-5">
            {error}
          </p>
        ) : snapshot ? (
          <>
            <div className="mb-6 rounded-2xl border border-border bg-card p-5">
              <h1 className="font-serif text-3xl">Shared research snapshot</h1>
              <p className="mt-3">
                Captured {new Date(snapshot.report.generatedAt).toLocaleString()} ·{' '}
                {Math.max(
                  0,
                  Math.floor((Date.now() - Date.parse(snapshot.report.generatedAt)) / 86400000),
                )}{' '}
                days old. This report is frozen; source records may have changed.
              </p>
              <Link href="/research" className="mt-3 inline-block text-primary underline">
                Start a fresh lookup
              </Link>
            </div>
            <ResearchReport report={snapshot.report} added={false} />
          </>
        ) : (
          <p role="status">Loading shared snapshot…</p>
        )}
      </div>
    </main>
  )
}
