# LeaseIQ Frontend - Complete Guide

## Overview

The LeaseIQ frontend is a beautiful, nature-inspired web application built with Next.js 14 and styled with the **Botanical/Organic design system**. It provides a complete apartment hunting experience from search to lease signing.

## 🎨 Design Philosophy

### Botanical/Organic Aesthetic

The design embodies the calming presence of a botanical garden—soft, sophisticated, and deeply intentional. Every element feels hand-touched, sun-warmed, and naturally crafted.

**Core Principles:**
- **Organic Softness**: Rounded corners, flowing shapes, arch-shaped images
- **Typographic Elegance**: Playfair Display for headlines, Source Sans 3 for body
- **Earthbound Palette**: Sage green, terracotta, warm alabaster, forest green
- **Tactile Texture**: Subtle paper grain overlay for warmth
- **Breathing Space**: Generous whitespace and padding
- **Intentional Movement**: Slow, graceful animations (duration-500 to duration-700)

## 🚀 Quick Start

### Installation

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Running the Application

**Option 1: Start Everything (Recommended)**
```bash
npm start
```
This starts both backend (port 3001) and frontend (port 3000).

**Option 2: Start Separately**
```bash
# Terminal 1: Backend
npm run start:backend

# Terminal 2: Frontend
npm run start:frontend

# Terminal 3: Alert cron job (optional)
npm run alerts
```

### Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📁 Project Structure

```
leaseiq/
├── frontend/                    # Next.js frontend application
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── page.tsx       # Home page
│   │   │   ├── layout.tsx     # Root layout
│   │   │   ├── globals.css    # Global styles
│   │   │   ├── search/        # Search page
│   │   │   ├── listing/[id]/  # Listing detail
│   │   │   ├── research/      # Research tool
│   │   │   ├── lease-analyzer/# Lease analyzer
│   │   │   ├── dashboard/     # User dashboard
│   │   │   └── how-it-works/  # Info page
│   │   ├── components/        # React components
│   │   │   ├── Navigation.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── home/          # Home sections
│   │   │   ├── search/        # Search components
│   │   │   └── listing/       # Listing components
│   │   └── lib/
│   │       └── api.ts         # API client
│   ├── public/                # Static assets
│   ├── tailwind.config.ts     # Tailwind config
│   ├── next.config.js         # Next.js config
│   └── package.json
├── src/                        # Backend source
│   ├── api/                   # Express API
│   ├── models/                # Mongoose models
│   ├── services/              # Business logic
│   └── ingestion/             # Data scraping
├── start-fullstack.js         # Start both servers
├── start-frontend.js          # Start frontend only
└── package.json               # Backend dependencies
```

## 🎯 Features & Pages

### 1. Home Page (`/`)

**Sections:**
- **Hero**: Large headline, CTA buttons, hero image with floating testimonial card
- **Stats**: 4-column grid showing key metrics
- **Features**: 4 feature cards with icons (search, alerts, research, lease analysis)
- **How It Works**: 3-step process with images
- **CTA**: Final call-to-action with decorative elements

**Design Highlights:**
- Arch-shaped hero image (rounded-[40px])
- Floating quote card with backdrop blur
- Staggered feature cards (every 2nd card translated vertically)
- Alternating image/text layout in How It Works

### 2. Search Page (`/search`)

**Components:**
- **SearchFilters**: Sticky sidebar with price, beds, baths, neighborhoods, amenities
- **SearchResults**: Grid of listing cards with sorting
- **ListingCard**: Image, price, details, badges (No Fee, Pets OK)

**Features:**
- Real-time filtering
- Sort by price, date, bedrooms
- Favorite/save listings
- Source badges (StreetEasy, Zillow, etc.)

**Design Highlights:**
- Rounded filter inputs (rounded-full)
- Hover lift on cards (-translate-y-2)
- Image scale on hover (scale-105)
- Soft shadows (shadow-soft)

### 3. Listing Detail (`/listing/[id]`)

**Sections:**
- Image gallery with navigation dots
- Thumbnail grid
- Listing details (price, beds, baths, sqft)
- Description and amenities
- Research CTA card
- Sticky sidebar with contact buttons

**Features:**
- Image carousel
- Favorite/share buttons
- Contact landlord
- Schedule tour
- Research integration

**Design Highlights:**
- Large arch-shaped main image
- Floating action buttons
- Soft clay background for details grid
- Primary/accent color badges

### 4. Research Page (`/research`)

**Flow:**
1. Input listing ID and optional email
2. Click "Start Research"
3. View results: summary, landlord reviews, violations
4. Email confirmation if provided

**Features:**
- Landlord review aggregation
- Building violation detection
- Neighborhood insights
- Email delivery

**Design Highlights:**
- Large textarea with rounded corners
- Color-coded results (green for good, red for warnings)
- Icon-based sections (Shield, AlertTriangle, CheckCircle)

### 5. Lease Analyzer (`/lease-analyzer`)

**Flow:**
1. Paste lease text
2. Optional email input
3. Click "Analyze Lease"
4. View red flags, key terms, recommendations

**Features:**
- AI-powered analysis
- Red flag detection
- Plain English explanations
- Email delivery

**Design Highlights:**
- Large textarea (rounded-3xl)
- Accent-colored warning sections
- Collapsible key terms
- Recommendation cards

### 6. Dashboard (`/dashboard`)

**Sections:**
- Quick stats (4 cards)
- Saved listings grid
- Active alerts/saved searches
- Recent activity timeline
- Quick action buttons

**Features:**
- Saved listing management
- Alert configuration
- Activity tracking
- Quick navigation

**Design Highlights:**
- Icon-based stat cards
- Compact listing cards with images
- Timeline-style activity feed
- Sidebar with saved searches

### 7. How It Works (`/how-it-works`)

**Sections:**
- Hero with headline
- Feature deep-dive (4 cards)
- Step-by-step process (4 steps)
- Why we're different (3 columns)
- Final CTA

**Design Highlights:**
- Numbered step badges
- Icon-based differentiation
- Alternating layouts
- Generous spacing

## 🎨 Design System Reference

### Colors

```css
/* Light Mode - Earthy & Muted */
--background: #F9F8F4;      /* Warm Alabaster */
--foreground: #2D3A31;      /* Deep Forest Green */
--primary: #8C9A84;         /* Sage Green */
--secondary: #DCCFC2;       /* Soft Clay */
--border: #E6E2DA;          /* Stone */
--accent: #C27B66;          /* Terracotta */
--card: #FFFFFF;            /* White */
--card-alt: #F2F0EB;        /* Light Clay */
```

### Typography

**Fonts:**
- Headlines: `font-serif` (Playfair Display)
- Body: `font-sans` (Source Sans 3)

**Scale:**
- `text-xs`: 0.75rem
- `text-sm`: 0.875rem
- `text-base`: 1rem
- `text-lg`: 1.125rem
- `text-xl`: 1.25rem
- `text-2xl`: 1.5rem
- `text-3xl`: 1.875rem
- `text-4xl`: 2.25rem
- `text-5xl`: 3rem
- `text-6xl`: 3.75rem
- `text-7xl`: 4.5rem
- `text-8xl`: 6rem

### Spacing

**Gap:**
- `gap-4`: 1rem
- `gap-6`: 1.5rem
- `gap-8`: 2rem
- `gap-12`: 3rem
- `gap-16`: 4rem

**Padding:**
- `p-4`: 1rem
- `p-6`: 1.5rem
- `p-8`: 2rem
- `p-12`: 3rem
- `p-16`: 4rem

**Vertical:**
- `py-16`: 4rem
- `py-24`: 6rem
- `py-32`: 8rem

### Border Radius

- `rounded-2xl`: 1rem
- `rounded-3xl`: 1.5rem
- `rounded-full`: 9999px (pill shape)
- `rounded-[40px]`: 40px (custom arch)
- `rounded-arch`: 200px 200px 0 0 (arch shape)

### Shadows

- `shadow-soft`: 0 4px 6px -1px rgba(45, 58, 49, 0.05)
- `shadow-soft-md`: 0 10px 15px -3px rgba(45, 58, 49, 0.05)
- `shadow-soft-lg`: 0 20px 40px -10px rgba(45, 58, 49, 0.05)
- `shadow-soft-xl`: 0 25px 50px -12px rgba(45, 58, 49, 0.15)

### Animations

**Durations:**
- Fast: `duration-300` (button hovers, color changes)
- Standard: `duration-500` (card lifts, transforms)
- Slow: `duration-700` (image scales, dramatic effects)

**Easing:**
- Default: `ease-out`
- Smooth: `transition-all`

**Common Patterns:**
```css
/* Card hover */
hover:-translate-y-2 transition-all duration-500

/* Image hover */
hover:scale-105 transition-transform duration-700

/* Button hover */
hover:bg-opacity-90 transition-all duration-300
```

## 🔧 API Integration

### API Client (`src/lib/api.ts`)

```typescript
import { api } from '@/lib/api'

// Search listings
const results = await api.searchListings({
  minPrice: 2000,
  maxPrice: 4000,
  bedrooms: 2,
  neighborhoods: ['Brooklyn', 'Manhattan']
}, {
  page: 1,
  limit: 20,
  sortBy: 'price',
  sortOrder: 'asc'
})

// Get listing by ID
const listing = await api.getListingById('listing-id')

// Research listing
const research = await api.researchListing('listing-id', 'user@email.com')

// Analyze lease
const analysis = await api.analyzeLease(leaseText, 'user@email.com')
```

### Backend Endpoints

- `GET /api/search` - Search listings with filters
- `GET /api/search/recent` - Get recent listings
- `GET /api/search/:id` - Get listing by ID
- `POST /api/research/:listingId` - Research a listing
- `POST /api/lease/analyze` - Analyze lease text
- `POST /api/alerts/process` - Process all alerts
- `POST /api/alerts/send/:savedSearchId` - Send immediate alert

## 📱 Responsive Design

### Breakpoints

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### Mobile Patterns

**Navigation:**
- Desktop: Horizontal nav with links
- Mobile: Hamburger menu with full-screen overlay

**Grids:**
- Desktop: `grid-cols-3`, `grid-cols-4`
- Mobile: `grid-cols-1`, `grid-cols-2`

**Typography:**
- Desktop: `text-8xl` headlines
- Mobile: `text-5xl` headlines

**Spacing:**
- Desktop: `py-32`, `gap-16`
- Mobile: `py-16`, `gap-12`

## 🚀 Deployment

### Build for Production

```bash
# Build backend
npm run build

# Build frontend
cd frontend
npm run build
cd ..
```

### Environment Variables

**Backend (`.env`):**
```
PORT=3001
MONGODB_URI=your_mongodb_uri
RESEND_API_KEY=your_resend_key
OPENROUTER_API_KEY=your_openrouter_key
FIRECRAWL_API_KEY=your_firecrawl_key
GOOGLE_GEOCODING_API_KEY=your_google_key
```

**Frontend (`frontend/.env.local`):**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Production Deployment

**Backend:**
- Deploy to Heroku, Railway, or DigitalOcean
- Set environment variables
- Ensure MongoDB is accessible
- Update CORS settings

**Frontend:**
- Deploy to Vercel (recommended for Next.js)
- Set `NEXT_PUBLIC_API_URL` to production backend URL
- Configure custom domain
- Enable analytics

## 🐛 Troubleshooting

### Backend won't start
- Check MongoDB connection string
- Verify port 3001 is available
- Ensure all API keys are set

### Frontend won't connect to backend
- Verify backend is running on port 3001
- Check `.env.local` has correct API URL
- Ensure CORS is enabled in backend

### Images not loading
- Check `next.config.js` image domains
- Verify image URLs are accessible
- Use placeholder images for development

### Build errors
- Run `npm install` in both root and frontend
- Check TypeScript errors
- Verify all imports are correct

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev)
- [Playfair Display Font](https://fonts.google.com/specimen/Playfair+Display)
- [Source Sans 3 Font](https://fonts.google.com/specimen/Source+Sans+3)

## 🎯 Next Steps

1. **Authentication**: Add Supabase auth for user accounts
2. **Real-time Updates**: WebSocket for instant notifications
3. **Map View**: Interactive map for listing locations
4. **Favorites**: Persistent saved listings
5. **Alerts**: Custom alert configuration UI
6. **Mobile App**: React Native version
7. **Analytics**: User behavior tracking
8. **A/B Testing**: Optimize conversion rates

## 💡 Tips for Development

1. **Use the design system**: Stick to defined colors, spacing, and typography
2. **Mobile-first**: Design for mobile, enhance for desktop
3. **Accessibility**: Add ARIA labels, keyboard navigation
4. **Performance**: Optimize images, lazy load components
5. **Testing**: Test on real devices, not just browser DevTools
6. **Consistency**: Follow existing patterns and conventions

---

Built with ❤️ using the Botanical/Organic design system
