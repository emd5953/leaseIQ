import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { ArrowUpRight } from 'lucide-react'
export default function NotFound() {
  return <main id="main-content"><Navigation /><div className="mx-auto flex min-h-[75vh] max-w-7xl flex-col justify-center px-6 pb-20 pt-32 sm:px-8"><p className="eyebrow text-primary">404 / A different direction</p><h1 className="page-title mt-5">This place isn’t on the map.</h1><p className="mt-5 max-w-lg text-muted-foreground">The page may have moved or the link may be incomplete. There are still plenty of places to look.</p><div className="mt-8 flex flex-wrap gap-4"><Link href="/search" className="btn btn-primary">Explore rentals<ArrowUpRight size={16} /></Link><Link href="/research" className="btn btn-secondary">Research an address</Link></div></div><Footer /></main>
}
