import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import SearchFilters from '@/components/search/SearchFilters'
import SearchResults from '@/components/search/SearchResults'

export default function SearchPage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-32 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-4">
              Find your <span className="italic">perfect</span> apartment
            </h1>
            <p className="text-lg text-foreground/70">
              Search across all major listing platforms in one place
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <aside className="lg:col-span-1">
              <SearchFilters />
            </aside>
            <div className="lg:col-span-3">
              <SearchResults />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
