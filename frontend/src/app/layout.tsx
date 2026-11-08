import type { Metadata } from 'next'
import { Instrument_Serif, Inter_Tight, Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'
import { Providers } from './providers'

const instrument = Instrument_Serif({ subsets: ['latin'], variable: '--font-instrument', weight: '400', style: ['normal', 'italic'], display: 'swap' })
const heading = Inter_Tight({ subsets: ['latin'], variable: '--font-heading', weight: ['500', '600'], display: 'swap' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500'], display: 'swap' })

export const metadata: Metadata = {
  title: 'LeaseIQ — Know more before the lease',
  description: 'Research NYC rental buildings, ownership and management records, and neighborhood context with source dates and clear evidence gaps.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${instrument.variable} ${heading.variable} ${inter.variable} ${mono.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased">
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
