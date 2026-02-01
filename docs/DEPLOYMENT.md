# LeaseIQ Deployment Guide

## Production Architecture

LeaseIQ requires **3 services** to run in production:

1. **Backend API** - Express server (port 3001)
2. **Scraper Cron** - Background job that runs every 15 minutes
3. **Frontend** - Next.js app (port 3000)

## Quick Start (All Services)

```bash
# Start backend + scraper together
npm start

# In another terminal, start frontend
cd frontend && npm run dev
```

## Individual Services

### Backend API Only
```bash
npm run start:backend
```

### Scraper Only
```bash
npm run start:scraper
```

### Frontend Only
```bash
cd frontend && npm run dev
```

## Deployment Options

### Option 1: Single Server (Recommended for MVP)

Run all services on one server using PM2:

```bash
# Install PM2
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Stop all
pm2 stop all
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'leaseiq-api',
      script: 'npx',
      args: 'tsx src/server.ts',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'leaseiq-scraper',
      script: 'npx',
      args: 'tsx src/jobs/scraping-cron.ts',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'leaseiq-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: './frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

### Option 2: Separate Services (Recommended for Scale)

Deploy each service separately:

#### Vercel (Frontend)
```bash
cd frontend
vercel deploy
```

#### Railway/Render (Backend API)
- Deploy `src/server.ts`
- Set environment variables
- Expose port 3001

#### Railway/Render (Scraper Cron)
- Deploy `src/jobs/scraping-cron.ts` as a separate service
- No port needed (background job)
- Set environment variables

### Option 3: Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Start both API and scraper
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    command: npm run start:backend
    ports:
      - "3001:3001"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY}
    
  scraper:
    build: .
    command: npm run start:scraper
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY}
    
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:3001
```

## Environment Variables

Required for all services:

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# Firecrawl
FIRECRAWL_API_KEY=fc-...
FIRECRAWL_API_URL=https://api.firecrawl.dev/v1

# Google Geocoding
GOOGLE_GEOCODING_API_KEY=...

# Email (Resend)
RESEND_API_KEY=re_...

# AI Analysis (OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-...

# PDF Parsing (Reducto)
REDUCTO_API_KEY=...
```

## Monitoring

### Check if services are running:

```bash
# API health check
curl http://localhost:3001/health

# Check scraper logs
pm2 logs leaseiq-scraper

# Check database
curl http://localhost:3001/api/search/recent
```

### Scraper Status

The scraper:
- Runs immediately on startup
- Then runs every 15 minutes
- Scrapes 100+ NYC apartments per run
- Takes ~3-5 minutes per run
- Stores in MongoDB automatically

## Troubleshooting

### Scraper not running?
```bash
# Check if process is alive
pm2 list

# View scraper logs
pm2 logs leaseiq-scraper

# Restart scraper
pm2 restart leaseiq-scraper
```

### No listings in database?
```bash
# Manually trigger scrape
npm run scrape

# Check MongoDB connection
curl http://localhost:3001/health
```

### API not responding?
```bash
# Check if port is in use
lsof -i :3001

# Restart API
pm2 restart leaseiq-api
```

## Production Checklist

- [ ] MongoDB Atlas connection string configured
- [ ] All API keys in environment variables
- [ ] Backend API running and accessible
- [ ] Scraper cron running in background
- [ ] Frontend deployed and connected to API
- [ ] Health checks passing
- [ ] First scrape completed successfully
- [ ] Monitoring/logging set up (PM2, Datadog, etc.)

## Scaling Considerations

As you grow:

1. **Separate scraper service** - Run on dedicated server/container
2. **Add more scrapers** - Run multiple instances for different cities
3. **Queue system** - Use Bull/BullMQ for job management
4. **Cache layer** - Add Redis for frequently accessed data
5. **Load balancer** - Multiple API instances behind load balancer
6. **Database replicas** - MongoDB replica set for high availability
