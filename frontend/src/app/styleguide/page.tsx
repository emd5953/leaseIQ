import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Search, Heart, Bell, FileText, AlertTriangle, CheckCircle } from 'lucide-react'

export default function StyleGuidePage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-32 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-6xl font-serif font-bold text-foreground mb-4">
            Style <span className="italic">Guide</span>
          </h1>
          <p className="text-xl text-foreground/70 mb-16">
            Botanical/Organic design system components and patterns
          </p>

          {/* Colors */}
          <section className="mb-24">
            <h2 className="text-4xl font-serif font-bold text-foreground mb-8">Colors</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="h-32 bg-background rounded-3xl border border-border mb-3" />
                <p className="font-semibold text-foreground">Background</p>
                <p className="text-sm text-foreground/70">#F9F8F4</p>
              </div>
              <div>
                <div className="h-32 bg-foreground rounded-3xl mb-3" />
                <p className="font-semibold text-foreground">Foreground</p>
                <p className="text-sm text-foreground/70">#2D3A31</p>
              </div>
              <div>
                <div className="h-32 bg-primary rounded-3xl mb-3" />
                <p className="font-semibold text-foreground">Primary</p>
                <p className="text-sm text-foreground/70">#8C9A84</p>
              </div>
              <div>
                <div className="h-32 bg-secondary rounded-3xl mb-3" />
                <p className="font-semibold text-foreground">Secondary</p>
                <p className="text-sm text-foreground/70">#DCCFC2</p>
              </div>
              <div>
                <div className="h-32 bg-accent rounded-3xl mb-3" />
                <p className="font-semibold text-foreground">Accent</p>
                <p className="text-sm text-foreground/70">#C27B66</p>
              </div>
              <div>
                <div className="h-32 bg-card rounded-3xl border border-border mb-3" />
                <p className="font-semibold text-foreground">Card</p>
                <p className="text-sm text-foreground/70">#FFFFFF</p>
              </div>
              <div>
                <div className="h-32 bg-card-alt rounded-3xl mb-3" />
                <p className="font-semibold text-foreground">Card Alt</p>
                <p className="text-sm text-foreground/70">#F2F0EB</p>
              </div>
              <div>
                <div className="h-32 bg-border rounded-3xl mb-3" />
                <p className="font-semibold text-foreground">Border</p>
                <p className="text-sm text-foreground/70">#E6E2DA</p>
              </div>
            </div>
          </section>

          {/* Typography */}
          <section className="mb-24">
            <h2 className="text-4xl font-serif font-bold text-foreground mb-8">Typography</h2>
            <div className="space-y-6">
              <div>
                <p className="text-8xl font-serif font-bold text-foreground">Heading 1</p>
                <p className="text-sm text-foreground/70 mt-2">text-8xl font-serif font-bold</p>
              </div>
              <div>
                <p className="text-6xl font-serif font-bold text-foreground">Heading 2</p>
                <p className="text-sm text-foreground/70 mt-2">text-6xl font-serif font-bold</p>
              </div>
              <div>
                <p className="text-4xl font-serif font-bold text-foreground">Heading 3</p>
                <p className="text-sm text-foreground/70 mt-2">text-4xl font-serif font-bold</p>
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">Heading 4</p>
                <p className="text-sm text-foreground/70 mt-2">text-2xl font-serif font-bold</p>
              </div>
              <div>
                <p className="text-xl font-serif font-bold text-foreground italic">
                  Italic Emphasis
                </p>
                <p className="text-sm text-foreground/70 mt-2">text-xl font-serif italic</p>
              </div>
              <div>
                <p className="text-lg text-foreground">Body Large - Source Sans 3</p>
                <p className="text-sm text-foreground/70 mt-2">text-lg</p>
              </div>
              <div>
                <p className="text-base text-foreground">Body Regular - Source Sans 3</p>
                <p className="text-sm text-foreground/70 mt-2">text-base</p>
              </div>
              <div>
                <p className="text-sm text-foreground/70">Small Text</p>
                <p className="text-sm text-foreground/70 mt-2">text-sm text-foreground/70</p>
              </div>
            </div>
          </section>

          {/* Buttons */}
          <section className="mb-24">
            <h2 className="text-4xl font-serif font-bold text-foreground mb-8">Buttons</h2>
            <div className="space-y-6">
              <div>
                <button className="px-8 py-4 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300">
                  Primary Button
                </button>
                <p className="text-sm text-foreground/70 mt-2">
                  bg-foreground text-background rounded-full
                </p>
              </div>
              <div>
                <button className="px-8 py-4 bg-transparent text-primary border border-primary rounded-full text-sm tracking-widest uppercase hover:bg-primary hover:text-background transition-all duration-300">
                  Secondary Button
                </button>
                <p className="text-sm text-foreground/70 mt-2">
                  border border-primary rounded-full
                </p>
              </div>
              <div>
                <button className="px-8 py-4 bg-primary text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300">
                  Accent Button
                </button>
                <p className="text-sm text-foreground/70 mt-2">
                  bg-primary text-background rounded-full
                </p>
              </div>
            </div>
          </section>

          {/* Cards */}
          <section className="mb-24">
            <h2 className="text-4xl font-serif font-bold text-foreground mb-8">Cards</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card rounded-3xl p-8 shadow-soft border border-border">
                <Search size={24} className="text-primary mb-4" strokeWidth={1.5} />
                <h3 className="text-xl font-serif font-bold text-foreground mb-2">
                  Standard Card
                </h3>
                <p className="text-foreground/70">
                  White background with soft shadow and border
                </p>
              </div>
              <div className="bg-card-alt rounded-3xl p-8">
                <Heart size={24} className="text-primary mb-4" strokeWidth={1.5} />
                <h3 className="text-xl font-serif font-bold text-foreground mb-2">
                  Alt Card
                </h3>
                <p className="text-foreground/70">
                  Clay background without shadow
                </p>
              </div>
              <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10">
                <Bell size={24} className="text-primary mb-4" strokeWidth={1.5} />
                <h3 className="text-xl font-serif font-bold text-foreground mb-2">
                  Accent Card
                </h3>
                <p className="text-foreground/70">
                  Primary color tint with border
                </p>
              </div>
            </div>
          </section>

          {/* Icons */}
          <section className="mb-24">
            <h2 className="text-4xl font-serif font-bold text-foreground mb-8">Icons</h2>
            <div className="flex flex-wrap gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Search size={24} className="text-primary" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-foreground/70">Search</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Heart size={24} className="text-primary" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-foreground/70">Heart</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Bell size={24} className="text-primary" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-foreground/70">Bell</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <FileText size={24} className="text-primary" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-foreground/70">FileText</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                  <AlertTriangle size={24} className="text-accent" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-foreground/70">Alert</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <CheckCircle size={24} className="text-primary" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-foreground/70">Check</p>
              </div>
            </div>
          </section>

          {/* Badges */}
          <section className="mb-24">
            <h2 className="text-4xl font-serif font-bold text-foreground mb-8">Badges</h2>
            <div className="flex flex-wrap gap-4">
              <span className="px-4 py-2 bg-primary text-background text-sm font-semibold rounded-full">
                No Fee
              </span>
              <span className="px-4 py-2 bg-accent text-background text-sm font-semibold rounded-full">
                Pets OK
              </span>
              <span className="px-4 py-2 bg-foreground/5 text-foreground text-sm font-medium rounded-full">
                StreetEasy
              </span>
              <span className="px-4 py-2 bg-primary/10 text-primary text-sm font-semibold rounded-full">
                New
              </span>
            </div>
          </section>

          {/* Inputs */}
          <section className="mb-24">
            <h2 className="text-4xl font-serif font-bold text-foreground mb-8">Form Inputs</h2>
            <div className="space-y-6 max-w-md">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Text Input
                </label>
                <input
                  type="text"
                  placeholder="Enter text..."
                  className="w-full px-6 py-4 bg-card-alt rounded-full border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Textarea
                </label>
                <textarea
                  placeholder="Enter longer text..."
                  rows={4}
                  className="w-full px-6 py-4 bg-card-alt rounded-3xl border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select
                </label>
                <select className="w-full px-6 py-4 bg-card-alt rounded-full border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                  <option>Option 1</option>
                  <option>Option 2</option>
                  <option>Option 3</option>
                </select>
              </div>
            </div>
          </section>

          {/* Shadows */}
          <section className="mb-24">
            <h2 className="text-4xl font-serif font-bold text-foreground mb-8">Shadows</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="bg-card rounded-3xl p-8 shadow-soft border border-border">
                <p className="font-semibold text-foreground mb-2">Soft</p>
                <p className="text-sm text-foreground/70">shadow-soft</p>
              </div>
              <div className="bg-card rounded-3xl p-8 shadow-soft-md border border-border">
                <p className="font-semibold text-foreground mb-2">Medium</p>
                <p className="text-sm text-foreground/70">shadow-soft-md</p>
              </div>
              <div className="bg-card rounded-3xl p-8 shadow-soft-lg border border-border">
                <p className="font-semibold text-foreground mb-2">Large</p>
                <p className="text-sm text-foreground/70">shadow-soft-lg</p>
              </div>
              <div className="bg-card rounded-3xl p-8 shadow-soft-xl border border-border">
                <p className="font-semibold text-foreground mb-2">Extra Large</p>
                <p className="text-sm text-foreground/70">shadow-soft-xl</p>
              </div>
            </div>
          </section>

          {/* Border Radius */}
          <section className="mb-24">
            <h2 className="text-4xl font-serif font-bold text-foreground mb-8">Border Radius</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="h-32 bg-primary/20 rounded-2xl mb-3" />
                <p className="font-semibold text-foreground">2XL</p>
                <p className="text-sm text-foreground/70">rounded-2xl (1rem)</p>
              </div>
              <div>
                <div className="h-32 bg-primary/20 rounded-3xl mb-3" />
                <p className="font-semibold text-foreground">3XL</p>
                <p className="text-sm text-foreground/70">rounded-3xl (1.5rem)</p>
              </div>
              <div>
                <div className="h-32 bg-primary/20 rounded-[40px] mb-3" />
                <p className="font-semibold text-foreground">Custom</p>
                <p className="text-sm text-foreground/70">rounded-[40px]</p>
              </div>
              <div>
                <div className="h-32 bg-primary/20 rounded-full mb-3" />
                <p className="font-semibold text-foreground">Full</p>
                <p className="text-sm text-foreground/70">rounded-full</p>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  )
}
