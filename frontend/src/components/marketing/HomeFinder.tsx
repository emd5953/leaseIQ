'use client'
import { useState } from 'react'
import { ArrowRight, Search, MapPin } from 'lucide-react'

export default function HomeFinder() {
  const [mode, setMode] = useState<'rentals' | 'research'>('rentals')
  const [rentalQuery, setRentalQuery] = useState('')
  const [address, setAddress] = useState('')
  const [borough, setBorough] = useState('Brooklyn')
  const research = mode === 'research'
  return (
    <div className="home-finder">
      <div className="finder-caption">
        <span>YOUR NEXT MOVE</span>
        <span>NYC ↗</span>
      </div>
      <div className="finder-tabs" role="tablist" aria-label="Start your search">
        {(['rentals', 'research'] as const).map((tab) => (
          <button
            key={tab}
            id={`finder-${tab}`}
            type="button"
            role="tab"
            aria-selected={mode === tab}
            aria-controls="finder-panel"
            tabIndex={mode === tab ? 0 : -1}
            onClick={() => setMode(tab)}
            onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault()
                const next =
                  event.key === 'Home'
                    ? 'rentals'
                    : event.key === 'End'
                      ? 'research'
                      : mode === 'rentals'
                        ? 'research'
                        : 'rentals'
                setMode(next)
                document.getElementById(`finder-${next}`)?.focus()
              }
            }}
          >
            {tab === 'rentals' ? 'Find a rental' : 'Check a building'}
          </button>
        ))}
      </div>
      <form
        id="finder-panel"
        role="tabpanel"
        aria-labelledby={`finder-${mode}`}
        action={research ? '/research' : '/search'}
        className="finder-form"
      >
        <h2>{research ? 'Know the address?' : 'Where feels like you?'}</h2>
        <p>
          {research
            ? 'Start with the building. Follow the records.'
            : 'Start wide. Get specific. Find your corner.'}
        </p>
        <label htmlFor="home-query">
          {research ? 'Street address' : 'Neighborhood, borough or street'}
        </label>
        <div className="finder-input">
          {research ? (
            <MapPin size={18} aria-hidden="true" />
          ) : (
            <Search size={18} aria-hidden="true" />
          )}
          <input
            id="home-query"
            name={research ? 'address' : 'q'}
            value={research ? address : rentalQuery}
            onChange={(e) =>
              research ? setAddress(e.target.value) : setRentalQuery(e.target.value)
            }
            maxLength={160}
            required={research}
            placeholder={research ? 'e.g. 125 Court Street' : 'e.g. Brooklyn'}
          />
        </div>
        {research && (
          <>
            <label htmlFor="home-borough">Borough</label>
            <select
              id="home-borough"
              name="borough"
              value={borough}
              onChange={(e) => setBorough(e.target.value)}
            >
              {['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </>
        )}
        <button type="submit" className="finder-submit">
          {research ? 'Research this address' : 'Explore rentals'}
          <ArrowRight size={18} />
        </button>
        <p className="finder-note">
          {research
            ? 'Public records, with source dates and clear limits.'
            : 'All five boroughs. No account needed to explore.'}
        </p>
      </form>
    </div>
  )
}
