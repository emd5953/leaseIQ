# Production vs Development Configuration

## Overview

LeaseIQ uses environment-aware configuration to provide a better development experience while maintaining strict controls in production.

---

## Rate Limiting

### Development (`NODE_ENV !== 'production'`)
```javascript
Standard Endpoints:    1000 requests / 15 minutes
Strict Endpoints:      200 requests / 15 minutes
Search Endpoints:      600 requests / 1 minute
Webhook Endpoints:     100 requests / 1 minute
```

**Why**: Allows rapid testing, frequent page refreshes, and debugging without hitting limits.

### Production (`NODE_ENV === 'production'`)
```javascript
Standard Endpoints:    100 requests / 15 minutes
Strict Endpoints:      20 requests / 15 minutes
Search Endpoints:      60 requests / 1 minute
Webhook Endpoints:     100 requests / 1 minute
```

**Why**: Prevents abuse, controls costs, and ensures fair usage across all users.

**File**: `src/api/middleware/rateLimiter.ts`

---

## API Endpoints

### Standard Endpoints (User Actions)
- `POST /api/auth/google` - Google OAuth login
- `GET /api/user/preferences` - Get user preferences
- `PUT /api/user/preferences` - Update preferences
- `GET /api/user/saved-listings` - Get saved listings
- `POST /api/user/saved-listings/:id` - Save a listing
- `DELETE /api/user/saved-listings/:id` - Unsave a listing
- `GET /api/user/saved-searches` - Get saved searches
- `POST /api/user/saved-searches` - Create saved search
- `PUT /api/user/saved-searches/:id` - Update saved search
- `DELETE /api/user/saved-searches/:id` - Delete saved search
- `POST /api/alerts/process` - Process alerts
- `POST /api/alerts/send/:id` - Send alert

**Dev**: 1000 req/15min | **Prod**: 100 req/15min

### Strict Endpoints (AI/Expensive Operations)
- `POST /api/research/:listingId` - AI-powered research
- `POST /api/lease/analyze` - AI lease analysis
- `POST /api/property/analyze` - Combined analysis
- `POST /api/floorplan/analyze` - Floor plan analysis

**Dev**: 200 req/15min | **Prod**: 20 req/15min

**Why Strict**: These endpoints use:
- OpenRouter API (costs money per request)
- Reducto API (costs money per PDF)
- Firecrawl API (costs money per scrape)
- Significant server resources

### Search Endpoints (Read-Heavy)
- `GET /api/search` - Search listings
- `GET /api/search/recent` - Recent listings
- `GET /api/search/:id` - Get listing by ID
- `GET /api/image-proxy` - Proxy images

**Dev**: 600 req/min | **Prod**: 60 req/min

### Webhook Endpoints (External Services)
- `POST /api/webhook/firecrawl` - Firecrawl webhooks

**Dev**: 100 req/min | **Prod**: 100 req/min (same)

---

## Environment Variables

### Development (.env)
```bash
# Relaxed settings for local development
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/leaseiq  # Local DB
LOG_LEVEL=debug  # Verbose logging

# API Keys (test/development keys)
FIRECRAWL_API_KEY=fc-dev-key
OPENROUTER_API_KEY=sk-or-dev-key
RESEND_API_KEY=re_dev_key
REDUCTO_API_KEY=dev_key

# JWT (simple secret for dev)
JWT_SECRET=leaseiq-dev-secret
```

### Production (.env)
```bash
# Strict settings for production
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/leaseiq  # Atlas
LOG_LEVEL=info  # Less verbose

# API Keys (production keys with higher limits)
FIRECRAWL_API_KEY=fc-prod-key
OPENROUTER_API_KEY=sk-or-prod-key
RESEND_API_KEY=re_prod_key
REDUCTO_API_KEY=prod_key

# JWT (strong secret for prod)
JWT_SECRET=complex-random-string-min-32-chars
```

---

## Frontend Configuration

### Development (frontend/.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=dev-client-id
```

### Production (frontend/.env.local)
```bash
NEXT_PUBLIC_API_URL=https://api.leaseiq.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=prod-client-id
```

---

## Logging

### Development
```javascript
console.log('[Service] Debug info')  // Allowed
console.error('[Service] Error:', error)  // Allowed
```
- Verbose logging
- Stack traces shown
- Debug information included

### Production
```javascript
logger.info('Request processed')  // Use proper logger
logger.error('Error occurred', { error })  // Structured logging
```
- Minimal logging
- No sensitive data
- Structured logs for monitoring
- Use Winston/Pino instead of console

**Recommendation**: Replace `console.log` with proper logging library

---

## Database

### Development
```javascript
// Local MongoDB or MongoDB Atlas free tier
MONGODB_URI=mongodb://localhost:27017/leaseiq

// Relaxed connection settings
serverSelectionTimeoutMS: 5000
socketTimeoutMS: 45000
```

### Production
```javascript
// MongoDB Atlas with replica set
MONGODB_URI=mongodb+srv://...

// Strict connection settings
serverSelectionTimeoutMS: 5000
socketTimeoutMS: 45000
maxPoolSize: 50  // Connection pooling
retryWrites: true
w: 'majority'  // Write concern
```

---

## CORS

### Development
```javascript
app.use(cors())  // Allow all origins
```

### Production
```javascript
app.use(cors({
  origin: [
    'https://leaseiq.com',
    'https://www.leaseiq.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
```

**File**: `src/api/index.ts` (needs to be updated)

---

## Error Handling

### Development
```javascript
// Detailed error messages
res.status(500).json({ 
  error: 'Database connection failed',
  details: error.message,
  stack: error.stack  // Include stack trace
})
```

### Production
```javascript
// Generic error messages
res.status(500).json({ 
  error: 'Internal server error',
  requestId: req.id  // For support lookup
})
// Log full error server-side only
```

---

## Caching

### Development
```javascript
// Short cache duration for testing
cacheDuration: 60000  // 1 minute
```

### Production
```javascript
// Longer cache duration for performance
cacheDuration: 300000  // 5 minutes
```

**File**: `frontend/src/lib/api.ts`

---

## Build Process

### Development
```bash
# Start dev server with hot reload
npm run dev

# TypeScript compilation on-the-fly
# No optimization
# Source maps included
```

### Production
```bash
# Build optimized bundle
npm run build

# TypeScript compiled to JavaScript
# Code minified and optimized
# No source maps
# Tree shaking applied

# Start production server
npm start
```

---

## Security

### Development
```javascript
// Relaxed security for testing
JWT_SECRET=simple-secret
tlsAllowInvalidCertificates: true  // For local MongoDB
```

### Production
```javascript
// Strict security
JWT_SECRET=complex-random-32-char-minimum-secret
tlsAllowInvalidCertificates: false
helmet()  // Security headers
rateLimit()  // Strict rate limiting
```

**TODO**: Add helmet middleware for production

---

## Monitoring

### Development
```javascript
// No monitoring needed
// Console logs sufficient
```

### Production
```javascript
// Required monitoring:
- Error tracking (Sentry, Rollbar)
- Performance monitoring (New Relic, DataDog)
- Uptime monitoring (UptimeRobot, Pingdom)
- Log aggregation (Loggly, Papertrail)
- Analytics (Google Analytics, Mixpanel)
```

**TODO**: Implement production monitoring

---

## Deployment

### Development
```bash
# Local machine
npm run dev

# Or Docker for consistency
docker-compose up
```

### Production
```bash
# Render.com (current)
- Auto-deploy from GitHub
- Environment variables in dashboard
- Health checks enabled
- Auto-scaling configured

# Or PM2 for VPS
pm2 start dist/server.js --name leaseiq-api
pm2 start dist/jobs/alert-cron.js --name leaseiq-alerts
```

---

## Testing

### Development
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Production
```bash
# Tests run in CI/CD before deployment
# No tests run in production environment
# Only pre-built, tested code deployed
```

---

## Quick Reference Table

| Feature | Development | Production |
|---------|-------------|------------|
| **Rate Limits** | 10x higher | Strict |
| **Logging** | Verbose | Minimal |
| **Error Details** | Full stack | Generic |
| **CORS** | Allow all | Specific origins |
| **Cache Duration** | 1 minute | 5 minutes |
| **JWT Secret** | Simple | Complex |
| **MongoDB** | Local/Free tier | Atlas cluster |
| **Source Maps** | Yes | No |
| **Monitoring** | Console | Full stack |
| **Hot Reload** | Yes | No |

---

## Setting NODE_ENV

### Development
```bash
# Automatically set by npm run dev
NODE_ENV=development npm run dev

# Or in .env file
NODE_ENV=development
```

### Production
```bash
# Set in hosting platform (Render, Heroku, etc.)
NODE_ENV=production

# Or in .env file
NODE_ENV=production

# Then run
npm run build
npm start
```

---

## Checklist: Dev → Prod

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Use production API keys
- [ ] Set strong JWT secret (32+ chars)
- [ ] Configure CORS for specific origins
- [ ] Use MongoDB Atlas (not local)
- [ ] Remove console.log statements
- [ ] Add error tracking (Sentry)
- [ ] Add monitoring (New Relic)
- [ ] Enable HTTPS
- [ ] Set up backups
- [ ] Configure auto-scaling
- [ ] Test rate limits
- [ ] Review security headers
- [ ] Set up CI/CD
- [ ] Document deployment process

---

## Current Status

✅ **Implemented**:
- Environment-aware rate limiting
- Separate dev/prod API keys
- Basic error handling
- MongoDB connection

⚠️ **TODO for Production**:
- [ ] Implement proper CORS restrictions
- [ ] Add helmet for security headers
- [ ] Replace console.log with Winston/Pino
- [ ] Add Sentry for error tracking
- [ ] Set up monitoring dashboard
- [ ] Implement health checks
- [ ] Add request ID tracking
- [ ] Configure log rotation
- [ ] Set up automated backups
- [ ] Add performance monitoring

---

## Files to Review

1. `src/api/middleware/rateLimiter.ts` - Rate limiting logic
2. `src/config/index.ts` - Environment configuration
3. `src/api/index.ts` - CORS and middleware setup
4. `src/server.ts` - Server initialization
5. `.env` - Environment variables
6. `frontend/.env.local` - Frontend configuration

---

## Support

**Development Issues**: Check console logs, use debugger  
**Production Issues**: Check monitoring dashboard, error tracking

**Questions?** See `API_EFFICIENCY_GUIDE.md` for detailed information.
