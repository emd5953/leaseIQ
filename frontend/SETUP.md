# Frontend Setup Guide

Complete guide to setting up and running the LeaseIQ frontend.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Backend API running (see main README)

## Installation

### 1. Install Dependencies

```bash
cd frontend
npm install
```

This will install:
- Next.js 14
- React 18
- Tailwind CSS
- Lucide React (icons)
- TypeScript

### 2. Environment Configuration

Create a `.env.local` file in the `frontend` directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

This tells the frontend where to find the backend API.

### 3. Start Development Server

```bash
npm run dev
```

The frontend will start on http://localhost:3000

## Project Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx           # Root layout with fonts & paper texture
│   │   ├── page.tsx             # Home page
│   │   ├── globals.css          # Global styles
│   │   ├── search/              # Search page
│   │   ├── listing/[id]/        # Dynamic listing detail page
│   │   ├── research/            # Research tool page
│   │   ├── lease-analyzer/      # Lease analyzer page
│   │   ├── dashboard/           # User dashboard
│   │   └── how-it-works/        # How it works page
│   ├── components/              # Reusable components
│   │   ├── Navigation.tsx       # Main navigation bar
│   │   ├── Footer.tsx           # Footer component
│   │   ├── home/                # Home page sections
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── Stats.tsx
│   │   │   └── CTA.tsx
│   │   ├── search/              # Search components
│   │   │   ├── SearchFilters.tsx
│   │   │   ├── SearchResults.tsx
│   │   │   └── ListingCard.tsx
│   │   └── listing/             # Listing components
│   │       └── ListingDetail.tsx
│   └── lib/                     # Utilities
│       └── api.ts               # API client functions
├── public/                      # Static assets
├── tailwind.config.ts           # Tailwind configuration
├── next.config.js              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies

```

## Available Pages

### Home (`/`)
- Hero section with CTA
- Stats showcase
- Feature highlights
- How it works overview
- Final CTA

### Search (`/search`)
- Sidebar with filters (price, beds, baths, neighborhoods, etc.)
- Grid of listing cards
- Sorting options
- Pagination (future)

### Listing Detail (`/listing/[id]`)
- Image gallery with navigation
- Listing details (price, beds, baths, sqft)
- Description and amenities
- Contact/tour buttons
- Research CTA

### Research (`/research`)
- Input form for listing ID and email
- Research results display
- Landlord reviews
- Building violations
- Email confirmation

### Lease Analyzer (`/lease-analyzer`)
- Textarea for lease text input
- Email input (optional)
- Analysis results
- Red flags highlighting
- Key terms explanation
- Recommendations

### Dashboard (`/dashboard`)
- Quick stats (saved listings, alerts, matches)
- Saved listings grid
- Active alerts/saved searches
- Recent activity timeline
- Quick action buttons

### How It Works (`/how-it-works`)
- Feature explanations
- Step-by-step process
- Why we're different
- CTA section

## Design System

### Botanical/Organic Aesthetic

The design embodies natural, organic beauty with:

**Typography:**
- Headlines: Playfair Display (serif, high-contrast)
- Body: Source Sans 3 (humanist sans-serif)
- Scale: Large and airy (text-5xl to text-8xl for headlines)

**Colors:**
- Background: `#F9F8F4` (warm alabaster)
- Foreground: `#2D3A31` (deep forest green)
- Primary: `#8C9A84` (sage green)
- Secondary: `#DCCFC2` (soft clay)
- Accent: `#C27B66` (terracotta)
- Border: `#E6E2DA` (stone)

**Shapes:**
- Highly rounded corners (`rounded-3xl`, `rounded-full`)
- Arch-shaped images (`rounded-[40px]`)
- Organic, flowing layouts

**Texture:**
- Paper grain overlay (SVG noise filter)
- Soft, diffused shadows
- Tactile, warm feel

**Animation:**
- Slow, graceful transitions (duration-500 to duration-700)
- Ease-out curves
- Hover lifts and scales

### Responsive Design

Mobile-first approach:
- Single column layouts on mobile
- Multi-column grids on desktop
- Hamburger menu on mobile
- Horizontal nav on desktop
- Reduced typography scale on mobile
- Adjusted spacing for smaller screens

## API Integration

The frontend uses the API client in `src/lib/api.ts`:

```typescript
import { api } from '@/lib/api'

// Search listings
const results = await api.searchListings(filters, options)

// Get listing by ID
const listing = await api.getListingById(id)

// Research listing
const research = await api.researchListing(listingId, email)

// Analyze lease
const analysis = await api.analyzeLease(leaseText, email)
```

## Development Tips

### Adding New Pages

1. Create page in `src/app/[page-name]/page.tsx`
2. Import Navigation and Footer
3. Follow design system patterns
4. Add to navigation menu

### Creating Components

1. Use TypeScript for props
2. Follow Tailwind utility-first approach
3. Add hover states and transitions
4. Ensure mobile responsiveness
5. Use Lucide React for icons

### Styling Guidelines

- Use Tailwind utility classes
- Follow spacing scale (gap-4, gap-8, gap-12, gap-16)
- Use design system colors
- Add transitions (duration-300 for fast, duration-500 for standard)
- Maintain consistent border radius

## Building for Production

```bash
npm run build
npm start
```

This creates an optimized production build and starts the server on port 3000.

## Troubleshooting

### Backend Connection Issues

If the frontend can't connect to the backend:
1. Ensure backend is running on port 3001
2. Check `.env.local` has correct API URL
3. Verify CORS is enabled in backend

### Image Loading Issues

If images don't load:
1. Check `next.config.js` image domains
2. Verify image URLs are accessible
3. Use placeholder images for development

### Build Errors

If build fails:
1. Run `npm install` to ensure dependencies are installed
2. Check TypeScript errors with `npm run build`
3. Verify all imports are correct

## Performance Optimization

- Images are optimized with Next.js Image component
- Code splitting with App Router
- CSS purging with Tailwind
- Font optimization with next/font
- Static generation where possible

## Browser Support

Tested and working on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

When adding features:
1. Follow the Botanical/Organic design system
2. Maintain consistent spacing and typography
3. Add proper TypeScript types
4. Test on mobile and desktop
5. Ensure accessibility (ARIA labels, keyboard navigation)

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev)
- [Google Fonts](https://fonts.google.com)
