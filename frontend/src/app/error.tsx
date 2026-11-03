'use client'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content"><Navigation /><div className="mx-auto min-h-[75vh] max-w-7xl px-6 pb-20 pt-40 sm:px-8"><p className="eyebrow text-danger">Page unavailable</p><h1 className="page-title mt-5">Let’s try that again.</h1><p role="alert" className="mt-5 max-w-lg text-muted-foreground">This page couldn’t finish loading. Retry, or return to the rental search.</p><div className="mt-8 flex flex-wrap gap-4"><button onClick={reset} className="btn btn-primary">Retry page</button><Link href="/search" className="btn btn-secondary">Explore rentals</Link></div></div><Footer /></main>
}
