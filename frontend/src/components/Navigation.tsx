'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, User, LogOut } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const { user, isLoading, loginWithCode, logout } = useAuth()

  // Debug logging
  console.log('Navigation render - user:', user, 'isLoading:', isLoading)

  // Only initialize Google login if client ID is available
  const googleLogin = GOOGLE_CLIENT_ID ? useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (response) => {
      console.log('Google OAuth success, code received')
      setIsSigningIn(true)
      try {
        await loginWithCode(response.code)
        console.log('Login completed successfully')
        // Close mobile menu if open
        setMobileMenuOpen(false)
      } catch (error) {
        console.error('Login failed:', error)
        alert('Login failed. Please try again.')
      } finally {
        setIsSigningIn(false)
      }
    },
    onError: (error) => {
      console.error('Google login failed:', error)
      alert('Google authentication failed. Please try again.')
      setIsSigningIn(false)
    },
  }) : null

  return (
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

            {/* Auth Section */}
            {!isLoading && (
              <>
                {user ? (
                  <div className="flex items-center gap-4">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 text-foreground hover:text-primary transition-colors duration-300"
                    >
                      <User size={18} />
                      <span>Dashboard</span>
                    </Link>
                    <button
                      onClick={logout}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-300"
                      title="Sign out"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                ) : googleLogin ? (
                  <button
                    onClick={() => googleLogin()}
                    disabled={isSigningIn}
                    className="px-5 py-2.5 bg-foreground text-background rounded-full text-sm tracking-wide hover:bg-foreground/90 transition-all duration-300 disabled:opacity-50"
                  >
                    {isSigningIn ? 'Signing in...' : 'Sign In'}
                  </button>
                ) : null}
              </>
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

            {/* Mobile Auth */}
            {!isLoading && (
              <div className="pt-4 border-t border-border">
                {user ? (
                  <div className="space-y-4">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 text-lg text-foreground hover:text-primary transition-colors duration-300"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User size={20} />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        logout()
                        setMobileMenuOpen(false)
                      }}
                      className="flex items-center gap-2 text-lg text-muted-foreground hover:text-foreground transition-colors duration-300"
                    >
                      <LogOut size={20} />
                      Sign Out
                    </button>
                  </div>
                ) : googleLogin ? (
                  <button
                    onClick={() => {
                      googleLogin()
                      setMobileMenuOpen(false)
                    }}
                    disabled={isSigningIn}
                    className="w-full px-6 py-3 bg-foreground text-background rounded-full text-sm tracking-wide hover:bg-foreground/90 transition-all duration-300 disabled:opacity-50"
                  >
                    {isSigningIn ? 'Signing in...' : 'Sign In with Google'}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
