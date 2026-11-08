import type { Metadata } from 'next'
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'
import { Providers } from './providers'

const heading = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['500', '600', '700'],
  display: 'swap',
})
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'LeaseIQ — Know more before the lease',
  description:
    'Research NYC rental buildings, ownership and management records, and neighborhood context with source dates and clear evidence gaps.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${heading.variable} ${inter.variable} ${mono.variable}`}
    >
      <body className="font-sans bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
