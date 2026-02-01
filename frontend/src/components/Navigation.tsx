'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, User, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from './AuthModal'

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const { user, signOut, loading } = useAuth()

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl font-serif font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                <span className="italic">LeaseI</span>Q
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link 
                href="/search" 
                className="text-foreground hover:text-primary transition-colors duration-300"
              >
                Search
              </Link>
              <Link 
                href="/how-it-works" 
                className="text-foreground hover:text-primary transition-colors duration-300"
              >
                How It Works
              </Link>
              <Link 
                href="/research" 
                className="text-foreground hover:text-primary transition-colors duration-300"
              >
                Research
              </Link>
              <Link 
                href="/lease-analyzer" 
                className="text-foreground hover:text-primary transition-colors duration-300"
              >
                Property Analyzer
              </Link>
              
              {!loading && (
                user ? (
                  <div className="flex items-center gap-4">
                    <Link
                      href="/dashboard"
                      className="px-6 py-3 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="p-2 text-foreground/60 hover:text-foreground transition-colors"
                      title="Sign out"
                    >
                      <LogOut size={20} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openAuth('signin')}
                    className="px-6 py-3 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300"
                  >
                    Sign In
                  </button>
                )
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-foreground hover:text-primary transition-colors duration-300"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-t border-border">
            <div className="px-6 py-6 space-y-4">
              <Link
                href="/search"
                className="block text-lg text-foreground hover:text-primary transition-colors duration-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                Search
              </Link>
              <Link
                href="/how-it-works"
                className="block text-lg text-foreground hover:text-primary transition-colors duration-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                href="/research"
                className="block text-lg text-foreground hover:text-primary transition-colors duration-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                Research
              </Link>
              <Link
                href="/lease-analyzer"
                className="block text-lg text-foreground hover:text-primary transition-colors duration-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                Property Analyzer
              </Link>
              
              {!loading && (
                user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="block px-6 py-3 bg-foreground text-background rounded-full text-sm tracking-widest uppercase text-center hover:bg-opacity-90 transition-all duration-300"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        signOut()
                        setMobileMenuOpen(false)
                      }}
                      className="block w-full px-6 py-3 text-foreground/70 text-sm text-center"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      openAuth('signin')
                    }}
                    className="block w-full px-6 py-3 bg-foreground text-background rounded-full text-sm tracking-widest uppercase text-center hover:bg-opacity-90 transition-all duration-300"
                  >
                    Sign In
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </nav>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  )
}
