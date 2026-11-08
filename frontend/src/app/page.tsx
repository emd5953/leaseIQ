import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  FileText,
  Building2,
  ScanLine,
  Check,
  Plus,
} from 'lucide-react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import StoryMotion, { HeroMedia } from '@/components/marketing/StoryMotion'
import HomeFinder from '@/components/marketing/HomeFinder'
import BrandMark from '@/components/BrandMark'

export default function Home() {
  return (
    <main id="main-content" className="field-guide">
      <Navigation />
      <section className="city-hero" aria-labelledby="hero-title">
        <HeroMedia />
        <div className="hero-grid">
          <div className="city-intro">
            <p className="city-kicker">
              <span />A renter’s field guide to New York
            </p>
            <h1 id="hero-title">
              Good places.
              <br />
              <span>Fewer surprises.</span>
            </h1>
            <p className="city-description">
              Fall for the apartment.
              <br />
              Get to know everything around it.
            </p>
            <a href="#beyond-the-listing" className="city-explore">
              See what’s behind the listing <ArrowRight size={18} />
            </a>
          </div>
          <HomeFinder />
        </div>
        <div className="film-caption">
          <span className="film-cross" aria-hidden="true">
            +
          </span>{' '}
          NEW YORK, IN REAL LIFE <span className="film-rule" />
          <span>Room for your next chapter.</span>
        </div>
      </section>
      <nav className="borough-index" aria-label="Explore rentals by borough">
        <p>
          Find your
          <br />
          <strong>side of the city.</strong>
        </p>
        {['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'].map((borough, i) => (
          <Link key={borough} href={`/search?neighborhoods=${encodeURIComponent(borough)}`}>
            <span className="borough-number">0{i + 1}</span>
            {borough}
            <ArrowUpRight size={16} />
          </Link>
        ))}
      </nav>
      <section id="beyond-the-listing" className="context-section">
        <div className="section-heading" data-reveal>
          <p className="section-tag">
            <span />
            THE BIGGER PICTURE
          </p>
          <h2>
            Love the space.
            <br />
            Know the place.
          </h2>
          <p>
            Great light gets your attention. Building history, lease terms, and the details between
            them help you decide.
          </p>
        </div>
        <div className="context-grid">
          <figure className="room-photo" data-reveal>
            <img
              src="/media/apartment-light.jpg"
              width="1200"
              height="800"
              alt="Sunlight falling across an apartment interior"
              loading="lazy"
            />
            <figcaption>
              <span>THE PART YOU CAN PICTURE</span>
              <p>
                Sunday mornings.
                <br />
                Your favorite chair.
              </p>
              <small>Atmosphere photography · not an available listing</small>
            </figcaption>
            <div className="photo-corner" aria-hidden="true">
              <Plus size={18} />
            </div>
          </figure>
          <div className="building-file" data-reveal>
            <div className="file-topline">
              <Building2 size={22} />
              <span>THE PART WORTH LOOKING INTO</span>
            </div>
            <h3>
              Every address
              <br />
              has a backstory.
            </h3>
            <p className="file-description">
              Put public records beside the listing, with a clear line between what’s known and what
              needs a closer look.
            </p>
            <dl className="evidence-index">
              <div>
                <dt>
                  <span className="evidence-dot" />
                  Source facts
                </dt>
                <dd>Housing records. Registered owners. Source dates.</dd>
              </div>
              <div>
                <dt>
                  <span className="evidence-dot dot-orange" />
                  What to ask
                </dt>
                <dd>Repair history, maintenance, and the next follow-up.</dd>
              </div>
              <div>
                <dt>
                  <span className="evidence-dot dot-outline" />
                  Still unknown
                </dt>
                <dd>Conditions in your unit. The experience of living there.</dd>
              </div>
            </dl>
            <Link href="/research" className="file-link">
              Open a building brief <ArrowUpRight size={19} />
            </Link>
            <p className="file-note">
              Public records have gaps. Missing information stays visible.
            </p>
          </div>
        </div>
      </section>
      <section className="decision-section">
        <header className="decision-heading" data-reveal>
          <div>
            <p className="section-tag">
              <span />
              FROM MAYBE TO MOVE-IN
            </p>
            <h2>
              Keep your head.
              <br />
              And your favorites.
            </h2>
          </div>
          <p>
            Your search is more than a folder of tabs. Bring the places, paperwork, and next steps
            together.
          </p>
        </header>
        <div className="decision-grid">
          <article className="shortlist-feature" data-reveal>
            <div className="feature-heading">
              <Bookmark size={22} />
              <p>THE SHORTLIST</p>
            </div>
            <h3>
              A few good possibilities.
              <br />
              One clearer choice.
            </h3>
            <p>
              Save the places you like. Compare up to three, keeping building ranges and exact unit
              rents in perspective.
            </p>
            <div
              className="shortlist-sample"
              aria-label="Illustrative shortlist, not available listings"
            >
              <div className="sample-label">A LOOK AT THE WORKSPACE · EXAMPLE ONLY</div>
              <div className="saved-example">
                <img
                  src="/media/apartment-living.jpg"
                  width="120"
                  height="90"
                  alt=""
                  loading="lazy"
                />
                <div>
                  <strong>The sunny one</strong>
                  <span>Unit rent · $3,200 / month</span>
                </div>
                <Check size={16} />
              </div>
              <div className="saved-example">
                <img
                  src="/media/brooklyn-street.jpg"
                  width="120"
                  height="90"
                  alt=""
                  loading="lazy"
                />
                <div>
                  <strong>The one on the corner</strong>
                  <span>Building range · $3,000–$4,400</span>
                </div>
                <Check size={16} />
              </div>
              <p>Illustrative prices. Confirm an exact unit and current availability.</p>
            </div>
            <Link href="/shortlist" className="feature-link">
              Make room for your favorites <ArrowRight size={18} />
            </Link>
          </article>
          <article className="lease-feature" data-reveal>
            <div className="feature-heading">
              <ScanLine size={22} />
              <p>THE FINE PRINT</p>
            </div>
            <h3>
              Before you sign,
              <br />
              read between the lines.
            </h3>
            <p>
              Bring a lease or floor plan. Get a closer look at the terms, the layout, and the
              questions to take back.
            </p>
            <div className="clause-sample">
              <div className="sample-label">
                <FileText size={14} /> ILLUSTRATIVE LEASE EXCERPT
              </div>
              <blockquote>
                “Written notice must be provided <mark>90 days before the lease expires.</mark>”
              </blockquote>
              <div className="clause-note">
                <span>↳</span>
                <p>
                  <strong>A date to put on your radar.</strong>
                  <br />
                  Confirm when and how renewal notice must be given.
                </p>
              </div>
              <p className="sample-limit">
                Analysis identifies questions; it doesn’t determine enforceability.
              </p>
            </div>
            <Link href="/lease-analyzer" className="feature-link">
              Give the documents a closer read <ArrowRight size={18} />
            </Link>
          </article>
        </div>
        <div className="move-strip" data-reveal>
          <div>
            <span className="section-tag">A PLACE FOR THE NEXT STEP</span>
            <h3>Keep the move moving.</h3>
          </div>
          <ol>
            {['Interested', 'Touring', 'Applied', 'Lease review', 'Moved in'].map((stage, i) => (
              <li key={stage}>
                <span aria-hidden="true">{i + 1}</span>
                {stage}
              </li>
            ))}
          </ol>
          <Link href="/dashboard" aria-label="Open your application tracker">
            <ArrowUpRight size={24} />
          </Link>
        </div>
        <p className="tracker-signin">
          You update the stages. Sign in to save them to your account.
        </p>
      </section>
      <section className="next-address" data-reveal>
        <div className="address-art" aria-hidden="true">
          <BrandMark />
          <span>
            FIND YOUR
            <br />
            NEXT ADDRESS.
          </span>
          <div className="address-lines">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div>
          <p className="section-tag">
            <span />
            YOUR CITY. YOUR CALL.
          </p>
          <h2>
            A new set of keys.
            <br />A little more clarity.
          </h2>
          <p>
            Explore the options. Ask better questions.
            <br />
            Make the move that feels right for you.
          </p>
          <div className="closing-actions">
            <Link href="/search" className="btn btn-primary">
              Let’s find your place <ArrowRight size={18} />
            </Link>
            <Link href="/how-it-works" className="text-link">
              How the research works <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>
      <Footer />
      <StoryMotion />
    </main>
  )
}
