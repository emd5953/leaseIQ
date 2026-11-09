'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, ArrowUpRight, LogOut } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'
import Dialog from './ui/Dialog'
const links = [['/search', 'Rentals'], ['/research', 'Property research'], ['/lease-analyzer', 'Lease analyzer'], ['/shortlist', 'Shortlist'], ['/dashboard', 'Dashboard']]
function GoogleSignIn({ onError }: { onError: (message: string) => void }) {
  const { loginWithCode } = useAuth()
  const [busy, setBusy] = useState(false)
  const login = useGoogleLogin({ flow: 'auth-code', onSuccess: async ({ code }) => {
    setBusy(true)
    try { await loginWithCode(code) } catch (e) { onError(e instanceof Error ? e.message : 'Sign-in failed. Please retry.') } finally { setBusy(false) }
  }, onError: () => onError('Google sign-in failed. Please try again.') })
  return <button onClick={() => login()} disabled={busy} className="nav-action">{busy ? 'Signing in…' : 'Sign in'}<ArrowUpRight size={14} /></button>
}
export default function Navigation() {
  const pathname = usePathname()
  const home = pathname === '/'
  const [open, setOpen] = useState(false)
  const [light, setLight] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [error, setError] = useState('')
  const { user, isLoading, logout } = useAuth()
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!home) return
    const update = () => { const moved = window.scrollY > 40; setScrolled(moved); const closing = document.getElementById('closing'); setLight(moved && !!closing && closing.getBoundingClientRect().top <= 72) }
    const layoutObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    layoutObserver?.observe(document.body)
    update(); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update)
    return () => { layoutObserver?.disconnect(); window.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [home])
  const auth = isLoading ? <span className="eyebrow text-muted-foreground">Loading account</span> : user ? <button onClick={logout} className="nav-action" aria-label="Sign out"><LogOut size={15} /><span>Sign out</span></button> : process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? <GoogleSignIn onError={setError} /> : <button className="nav-action" onClick={() => setError('Sign-in is unavailable in this environment. You can still browse rentals, research addresses, and save a shortlist in this browser.')}>Sign in<ArrowUpRight size={14} /></button>
  return <><a href="#page-content" className="skip-link">Skip to content</a><nav aria-label="Main navigation" className={`site-nav ${home ? 'nav-home' : ''} ${light ? 'nav-light' : ''} ${scrolled ? 'nav-scrolled' : ''}`}>
    <div className="nav-inner"><Link href="/" aria-label="LeaseIQ home" className="wordmark text-[29px]">LeaseIQ<span className="ml-1 text-primary">.</span></Link>
      <div className="hidden items-center gap-6 xl:gap-8 lg:flex">{links.map(([href,label]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className="nav-link">{label}</Link>)}{auth}</div>
      <button aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full border border-current/20 lg:hidden"><Menu size={20} /></button>
    </div>
  </nav>{open && <Dialog title="Explore LeaseIQ" onClose={() => setOpen(false)}><div className="flex flex-col">{[...links, ['/how-it-works', 'How it works']].map(([href,label]) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={pathname === href ? 'page' : undefined} className="flex min-h-14 items-center justify-between border-b border-border text-lg">{label}<ArrowUpRight size={17} /></Link>)}<div className="mt-6">{auth}</div></div></Dialog>}{error && <Dialog title="Account access" onClose={() => setError('')}><p role="status" className="text-muted-foreground">{error}</p><button className="btn btn-primary mt-6" onClick={() => setError('')}>Continue exploring</button></Dialog>}<span id="page-content" tabIndex={-1} className="sr-only" /></>
}
