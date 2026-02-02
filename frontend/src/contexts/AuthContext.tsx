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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    console.log('AuthProvider: Loading user from localStorage...')
    const storedToken = localStorage.getItem('leaseiq_token')
    const storedUser = localStorage.getItem('leaseiq_user')

    if (storedToken && storedUser) {
      console.log('Found stored user:', JSON.parse(storedUser))
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    } else {
      console.log('No stored user found')
    }
    setIsLoading(false)
  }, [])

  const login = async (credential: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      })

      if (!response.ok) {
        throw new Error('Authentication failed')
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

  const loginWithCode = async (code: string) => {
    try {
      console.log('Attempting login with code...')
      const response = await fetch(`${API_URL}/api/auth/google/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Authentication failed:', errorData)
        throw new Error(`Authentication failed: ${errorData.error || response.statusText}`)
      }

      const data = await response.json()
      console.log('Login successful, user:', data.user)

      setToken(data.token)
      setUser(data.user)

      localStorage.setItem('leaseiq_token', data.token)
      localStorage.setItem('leaseiq_user', JSON.stringify(data.user))
      
      console.log('User state updated and saved to localStorage')
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = () => {
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
