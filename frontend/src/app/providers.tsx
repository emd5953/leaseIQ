'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from '@/contexts/AuthContext'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export function Providers({ children }: { children: React.ReactNode }) {
  // Only render GoogleOAuthProvider if client ID is available
  if (!GOOGLE_CLIENT_ID) {
    console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Google OAuth will be disabled.')
    return <AuthProvider>{children}</AuthProvider>
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
