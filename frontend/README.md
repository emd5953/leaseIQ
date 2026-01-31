# LeaseIQ Frontend

Beautiful, nature-inspired frontend for the LeaseIQ rental platform, built with Next.js and the Botanical/Organic design system.

## Design Philosophy

This frontend embodies a **Botanical/Organic** aesthetic—soft, sophisticated, and deeply intentional. It rejects rigid digital sharpness in favor of warmth, tactility, and natural imperfection.

### Key Design Elements

- **Typography**: Playfair Display (serif) for headlines, Source Sans 3 for body text
- **Colors**: Earthy, muted palette inspired by nature (sage green, terracotta, warm alabaster)
- **Shapes**: Highly rounded corners, arch-shaped images, organic flow
- **Texture**: Subtle paper grain overlay for tactile warmth
- **Animation**: Slow, graceful transitions (duration-500 to duration-700)
- **Spacing**: Generous whitespace and breathing room

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Fonts**: Google Fonts (Playfair Display, Source Sans 3)
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API running on `http://localhost:3001`

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── page.tsx           # Home page
│   │   ├── search/            # Search listings
│   │   ├── listing/[id]/      # Listing detail
│   │   ├── research/          # Research tool
│   │   ├── lease-analyzer/    # Lease analyzer
│   │   ├── dashboard/         # User dashboard
│   │   └── how-it-works/      # How it works page
│   ├── components/            # React components
│   │   ├── Navigation.tsx     # Main navigation
│   │   ├── Footer.tsx         # Footer
│   │   ├── home/              # Home page sections
│   │   ├── search/            # Search components
│   │   └── listing/           # Listing components
│   └── app/
│       ├── layout.tsx         # Root layout with fonts
│       └── globals.css        # Global styles
├── public/                    # Static assets
├── tailwind.config.ts         # Tailwind configuration
├── next.config.js            # Next.js configuration
└── package.json              # Dependencies

```

## Pages

### Home (`/`)
Landing page with hero, features, how it works, stats, and CTA sections.

### Search (`/search`)
Browse and filter apartment listings with advanced search filters.

### Listing Detail (`/listing/[id]`)
Detailed view of a single listing with image gallery, amenities, and research CTA.

### Research (`/research`)
Research tool for getting landlord reviews, building violations, and insights.

### Lease Analyzer (`/lease-analyzer`)
AI-powered lease analysis tool to identify red flags and explain terms.

### Dashboard (`/dashboard`)
User dashboard showing saved listings, alerts, and recent activity.

### How It Works (`/how-it-works`)
Detailed explanation of the platform's features and process.

## API Integration

The frontend connects to the backend API at `http://localhost:3001`. API routes are proxied through Next.js:

- `GET /api/search` - Search listings
- `GET /api/search/recent` - Get recent listings
- `GET /api/search/:id` - Get listing by ID
- `POST /api/research/:listingId` - Research a listing
- `POST /api/lease/analyze` - Analyze lease text

## Design System

### Colors

```css
background: #F9F8F4    /* Warm alabaster */
foreground: #2D3A31    /* Deep forest green */
primary: #8C9A84       /* Sage green */
secondary: #DCCFC2     /* Soft clay */
border: #E6E2DA        /* Stone */
accent: #C27B66        /* Terracotta */
```

### Typography Scale

- Headings: `text-4xl` to `text-8xl` (font-serif)
- Body: `text-base` to `text-xl` (font-sans)
- Small: `text-sm` to `text-xs`

### Border Radius

- Cards: `rounded-3xl` (24px)
- Buttons: `rounded-full` (pill shape)
- Images: `rounded-[40px]` or `rounded-arch` (200px arch)

### Shadows

- Soft: `shadow-soft`
- Medium: `shadow-soft-md`
- Large: `shadow-soft-lg`
- Extra Large: `shadow-soft-xl`

## Responsive Design

Mobile-first approach with breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

Key responsive patterns:
- Navigation: Hamburger menu on mobile, horizontal on desktop
- Grids: Single column on mobile, multi-column on desktop
- Typography: Scales down on mobile (text-5xl → text-8xl)
- Spacing: Reduced padding/margins on mobile

## Performance

- Image optimization with Next.js Image component
- Code splitting with Next.js App Router
- CSS purging with Tailwind
- Font optimization with next/font

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

When adding new components or pages:
1. Follow the Botanical/Organic design system
2. Use Tailwind utility classes
3. Maintain consistent spacing and typography
4. Add hover states and transitions
5. Ensure mobile responsiveness
6. Test across browsers

## License

ISC
