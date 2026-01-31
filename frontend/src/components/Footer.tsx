import Link from 'next/link'
import { Mail, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-card-alt border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-2xl font-serif font-bold text-foreground">
              Lease<span className="italic">IQ</span>
            </h3>
            <p className="text-foreground/70 text-sm leading-relaxed">
              Find apartments faster. Know what you're signing before you sign.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="font-serif font-semibold text-foreground">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/search" className="text-foreground/70 hover:text-primary transition-colors duration-300 text-sm">
                  Search Listings
                </Link>
              </li>
              <li>
                <Link href="/research" className="text-foreground/70 hover:text-primary transition-colors duration-300 text-sm">
                  Research Tool
                </Link>
              </li>
              <li>
                <Link href="/lease-analyzer" className="text-foreground/70 hover:text-primary transition-colors duration-300 text-sm">
                  Lease Analyzer
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-foreground/70 hover:text-primary transition-colors duration-300 text-sm">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="font-serif font-semibold text-foreground">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/how-it-works" className="text-foreground/70 hover:text-primary transition-colors duration-300 text-sm">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-foreground/70 hover:text-primary transition-colors duration-300 text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-foreground/70 hover:text-primary transition-colors duration-300 text-sm">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-serif font-semibold text-foreground">Get in Touch</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-foreground/70 text-sm">
                <MapPin size={16} className="text-primary" strokeWidth={1.5} />
                <span>New York, NY</span>
              </li>
              <li className="flex items-center gap-2 text-foreground/70 text-sm">
                <Mail size={16} className="text-primary" strokeWidth={1.5} />
                <a href="mailto:hello@leaseiq.com" className="hover:text-primary transition-colors duration-300">
                  hello@leaseiq.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-center text-foreground/60 text-sm">
            © {new Date().getFullYear()} LeaseIQ. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
