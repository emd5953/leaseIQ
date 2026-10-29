'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  displayName: string | null
  picture?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (credential: string) => Promise<void>
  loginWithCode: (code: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

import { API_URL, apiFetch, api } from '@/lib/api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('leaseiq_token')
    const storedUser = localStorage.getItem('leaseiq_user')

    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('leaseiq_user')
        localStorage.removeItem('leaseiq_token')
      }
    }
    setIsLoading(false)
    const expired = () => {
      setUser(null)
      setToken(null)
      localStorage.removeItem('leaseiq_token')
      localStorage.removeItem('leaseiq_user')
      api.invalidateSavedListingsCache()
    }
    window.addEventListener('leaseiq-session-expired', expired)
    return () => window.removeEventListener('leaseiq-session-expired', expired)
  }, [])

  const login = async (credential: string) => {
    try {
      const response = await apiFetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      })

      if (!response.ok) {
        throw new Error('Authentication failed')
      }

      const data = await response.json()

      api.invalidateSavedListingsCache()
      setToken(data.token)
      setUser(data.user)

      localStorage.setItem('leaseiq_token', data.token)
      localStorage.setItem('leaseiq_user', JSON.stringify(data.user))
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const loginWithCode = async (code: string) => {
    try {
      const response = await apiFetch(`${API_URL}/api/auth/google/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Authentication failed:', errorData)

        // Show more detailed error to user
        const errorMessage = errorData.error || 'Sign-in failed. Please try again.'
        throw new Error(`Authentication failed: ${errorMessage}`)
      }

      const data = await response.json()

      setToken(data.token)
      setUser(data.user)

      localStorage.setItem('leaseiq_token', data.token)
      localStorage.setItem('leaseiq_user', JSON.stringify(data.user))
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = () => {
    api.invalidateSavedListingsCache()
    setToken(null)
    setUser(null)
    localStorage.removeItem('leaseiq_token')
    localStorage.removeItem('leaseiq_user')
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, loginWithCode, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
