import Link from 'next/link'
import BrandMark from './BrandMark'
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Link href="/" className="brand-lockup">
            <BrandMark />
            <span className="wordmark">
              Lease<span className="brand-iq">IQ</span>
            </span>
          </Link>
          <p>
            Your next address.
            <br />A better-informed you.
          </p>
        </div>
        <div className="footer-links">
          {[
            ['/search', 'Find a rental'],
            ['/research', 'Check a building'],
            ['/shortlist', 'Your shortlist'],
            ['/lease-analyzer', 'Read the fine print'],
            ['/dashboard', 'Your workspace'],
            ['/how-it-works', 'How it works'],
          ].map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="footer-bottom">
        <span>BUILT FOR NEW YORK’S RENTERS</span>
        <p>Public records have limits. Better questions start here.</p>
        <div>
          <Link href="/styleguide">Design system</Link>
          <a href="/media/credits.json" target="_blank" rel="noreferrer">
            Film & photography
          </a>
        </div>
      </div>
    </footer>
  )
}
