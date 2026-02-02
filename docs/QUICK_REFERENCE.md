# LeaseIQ Quick Reference

## 🚀 Getting Started

```bash
# Setup (first time only)
npm install && cd frontend && npm install && cd ..

# Start everything
npm start

# Or start separately
npm run start:backend  # Port 3001
npm run start:frontend # Port 3000
```

## 🌐 URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Health: http://localhost:3001/health
- Style Guide: http://localhost:3000/styleguide

## 📁 Key Files

```
frontend/
├── src/app/              # Pages
├── src/components/       # Components
├── src/lib/api.ts       # API client
├── tailwind.config.ts   # Design system
└── next.config.js       # Next.js config

Backend:
├── src/api/routes/      # API endpoints
├── src/models/          # Database models
└── src/services/        # Business logic
```

## 🎨 Design System

### Colors
```css
background: #F9F8F4  /* Warm alabaster */
foreground: #2D3A31  /* Deep forest green */
primary:    #8C9A84  /* Sage green */
secondary:  #DCCFC2  /* Soft clay */
accent:     #C27B66  /* Terracotta */
border:     #E6E2DA  /* Stone */
```

### Typography
```css
font-serif: Playfair Display  /* Headlines */
font-sans:  Source Sans 3     /* Body text */
```

### Common Classes
```css
/* Cards */
bg-card rounded-3xl p-8 shadow-soft border border-border

/* Buttons */
px-8 py-4 bg-foreground text-background rounded-full

/* Inputs */
px-6 py-4 bg-card-alt rounded-full border border-border

/* Hover lift */
hover:-translate-y-2 transition-all duration-500

/* Image scale */
hover:scale-105 transition-transform duration-700
```

## 🔌 API Endpoints

### Search
```
GET  /api/search              # Search listings
GET  /api/search/recent       # Recent listings
GET  /api/search/:id          # Get by ID
```

### Research
```
POST /api/research/:listingId # Research listing
```

### Lease & Floor Plan
```
POST /api/lease/analyze              # Analyze lease text
POST /api/property/analyze           # Combined lease + floor plan
POST /api/property/analyze-floorplan-only  # Floor plan only
```

### User & Alerts
```
GET  /api/user/preferences                    # Get preferences
PUT  /api/user/preferences                    # Update preferences
GET  /api/user/saved-listings                 # Get saved listings
POST /api/user/saved-listings/:id             # Save listing
DELETE /api/user/saved-listings/:id           # Unsave listing
GET  /api/user/saved-searches                 # Get saved searches
POST /api/user/saved-searches                 # Create saved search
PUT  /api/user/saved-searches/:id             # Update saved search
DELETE /api/user/saved-searches/:id           # Delete saved search
POST /api/user/saved-searches/:id/test-alert  # Send test alert
```

## 📄 Pages

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/search` | Browse listings |
| `/listing/[id]` | Listing detail |
| `/research` | Research tool |
| `/lease-analyzer` | Lease analyzer |
| `/dashboard` | User dashboard |
| `/how-it-works` | Info page |
| `/styleguide` | Design system |

## 🧩 Key Components

```typescript
// Navigation
<Navigation />

// Footer
<Footer />

// Listing Card
<ListingCard listing={listing} />

// Search Filters
<SearchFilters />

// Search Results
<SearchResults />

// Listing Detail
<ListingDetail listing={listing} />
```

## 🎯 Common Tasks

### Add a new page
```typescript
// 1. Create src/app/[page]/page.tsx
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

export default function MyPage() {
  return (
    <main>
      <Navigation />
      {/* Your content */}
      <Footer />
    </main>
  )
}

// 2. Add to Navigation.tsx
<Link href="/my-page">My Page</Link>
```

### Create a component
```typescript
// src/components/MyComponent.tsx
interface MyComponentProps {
  title: string
}

export default function MyComponent({ title }: MyComponentProps) {
  return (
    <div className="bg-card rounded-3xl p-8 shadow-soft">
      <h2 className="text-2xl font-serif font-bold">{title}</h2>
    </div>
  )
}
```

### Call API
```typescript
import { api } from '@/lib/api'

// Search
const results = await api.searchListings({ minPrice: 2000 })

// Get listing
const listing = await api.getListingById(id)

// Research
const research = await api.researchListing(id, email)

// Analyze lease
const analysis = await api.analyzeLease(text, email)
```

### Add a color
```typescript
// tailwind.config.ts
colors: {
  'my-color': '#HEXCODE',
}

// Use it
<div className="bg-my-color text-white">
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check MongoDB connection
# Verify .env has MONGODB_URI
# Ensure port 3001 is free
```

### Frontend won't connect
```bash
# Check backend is running
# Verify frontend/.env.local has API URL
# Check CORS in backend
```

### Build errors
```bash
# Reinstall dependencies
npm install
cd frontend && npm install

# Check TypeScript errors
npm run build
```

## 📚 Documentation

- `README.md` - Project overview
- `docs/FRONTEND_GUIDE.md` - Frontend guide
- `docs/RESEND_REDUCTO_GUIDE.md` - Email & PDF parsing
- `docs/FLOOR_PLAN_ANALYSIS.md` - Floor plan analysis
- `docs/RESEND_ALERT_INTEGRATION.md` - Alert system with Resend
- `docs/ALERT_QUICK_START.md` - Quick alert setup
- `docs/API.md` - API documentation
- `docs/QUICKSTART.md` - Quick start guide

## 🎨 Design Patterns

### Card with hover
```tsx
<div className="bg-card rounded-3xl p-8 shadow-soft hover:shadow-soft-lg hover:-translate-y-2 transition-all duration-500 border border-border">
  {/* Content */}
</div>
```

### Primary button
```tsx
<button className="px-8 py-4 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300">
  Click Me
</button>
```

### Secondary button
```tsx
<button className="px-8 py-4 bg-transparent text-primary border border-primary rounded-full text-sm tracking-widest uppercase hover:bg-primary hover:text-background transition-all duration-300">
  Click Me
</button>
```

### Input field
```tsx
<input
  type="text"
  className="w-full px-6 py-4 bg-card-alt rounded-full border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
/>
```

### Icon circle
```tsx
<div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
  <Icon size={24} className="text-primary" strokeWidth={1.5} />
</div>
```

### Section spacing
```tsx
<section className="py-24 md:py-32 px-6 lg:px-8">
  <div className="max-w-7xl mx-auto">
    {/* Content */}
  </div>
</section>
```

### Grid with stagger
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
  {items.map((item, i) => (
    <div key={i} className={i % 2 === 1 ? 'md:translate-y-12' : ''}>
      {/* Card */}
    </div>
  ))}
</div>
```

## 💡 Pro Tips

1. **Use the style guide**: Visit `/styleguide` for live examples
2. **Follow patterns**: Copy existing components as templates
3. **Mobile first**: Design for mobile, enhance for desktop
4. **Test responsively**: Check all breakpoints
5. **Keep it botanical**: Stick to the design system
6. **Generous spacing**: When in doubt, add more whitespace
7. **Slow animations**: duration-500 or duration-700
8. **Soft shadows**: Use shadow-soft variants
9. **Round everything**: rounded-3xl or rounded-full
10. **Icons at 1.5**: strokeWidth={1.5} for consistency

## 🎯 Next Steps

1. Run `npm start` to see it live
2. Visit http://localhost:3000
3. Explore the style guide at `/styleguide`
4. Read `FRONTEND_GUIDE.md` for deep dive
5. Start building!

---

**Need help?** Check the full documentation in `FRONTEND_GUIDE.md`
