# LeaseIQ - Deployment Guide

## Production Deployment Checklist

### 1. Environment Setup

Create a production `.env` file with all required variables:

```env
# MongoDB (Production)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/leaseiq?retryWrites=true&w=majority

# Email Service
RESEND_API_KEY=re_your_production_key

# Web Scraping
FIRECRAWL_API_KEY=fc_your_production_key

# AI Analysis
OPENROUTER_API_KEY=sk_your_production_key

# Optional Services
GOOGLE_GEOCODING_API_KEY=your_google_key
REDUCTO_API_KEY=your_reducto_key

# Server Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_FIRECRAWL=100
RATE_LIMIT_GEOCODING=50

# Scraping Configuration
SCRAPING_SCHEDULE=0 */6 * * *
MAX_LISTINGS_PER_SOURCE=1000
STALE_LISTING_DAYS=30
```

### 2. Build the Application

```bash
# Install production dependencies
npm ci --production

# Build TypeScript
npm run build

# Verify build
ls dist/
```

### 3. Database Setup

1. **Create MongoDB Atlas Cluster** (or use your MongoDB instance)
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free M0 cluster
   - Whitelist your server IP
   - Create database user
   - Get connection string

2. **Initialize Database**
   - Models will auto-create collections on first use
   - Indexes will be created automatically
   - No manual schema setup needed

### 4. Deployment Options

#### Option A: Traditional VPS (DigitalOcean, AWS EC2, etc.)

1. **Install Node.js 18+**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install PM2 for process management**
   ```bash
   npm install -g pm2
   ```

3. **Deploy application**
   ```bash
   # Clone repository
   git clone https://github.com/your-repo/leaseiq.git
   cd leaseiq
   
   # Install dependencies
   npm ci --production
   
   # Build
   npm run build
   
   # Start with PM2
   pm2 start dist/server.js --name leaseiq-api
   pm2 start dist/jobs/alert-cron.js --name leaseiq-alerts
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

4. **Set up Nginx reverse proxy**
   ```nginx
   server {
       listen 80;
       server_name api.leaseiq.app;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Set up SSL with Let's Encrypt**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.leaseiq.app
   ```

#### Option B: Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --production
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   
   CMD ["node", "dist/server.js"]
   ```

2. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   
   services:
     api:
       build: .
       ports:
         - "3000:3000"
       env_file:
         - .env
       restart: unless-stopped
       depends_on:
         - mongodb
     
     alerts:
       build: .
       command: node dist/jobs/alert-cron.js
       env_file:
         - .env
       restart: unless-stopped
       depends_on:
         - mongodb
     
     mongodb:
       image: mongo:7
       volumes:
         - mongodb_data:/data/db
       restart: unless-stopped
   
   volumes:
     mongodb_data:
   ```

3. **Deploy**
   ```bash
   docker-compose up -d
   ```

#### Option C: Serverless (Vercel/Railway/Render)

**Note:** Cron jobs need separate handling in serverless environments.

1. **Deploy API to Vercel**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

2. **Set up cron job separately**
   - Use Vercel Cron (paid feature)
   - Or use external cron service (cron-job.org, EasyCron)
   - Or deploy cron job to separate service (Railway, Render)

### 5. Monitoring & Logging

#### Set up logging

```typescript
// Add to src/server.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

#### Set up monitoring

- **Uptime monitoring:** UptimeRobot, Pingdom
- **Error tracking:** Sentry
- **Performance monitoring:** New Relic, DataDog
- **Log aggregation:** Logtail, Papertrail

### 6. Security Checklist

- [ ] Use HTTPS (SSL certificate)
- [ ] Set secure environment variables
- [ ] Enable MongoDB authentication
- [ ] Whitelist IP addresses in MongoDB Atlas
- [ ] Add rate limiting to API endpoints
- [ ] Implement API authentication (Supabase)
- [ ] Sanitize user inputs
- [ ] Keep dependencies updated
- [ ] Use secrets management (AWS Secrets Manager, Vault)

### 7. Performance Optimization

1. **Enable MongoDB indexes**
   - Already configured in models
   - Verify with: `db.listings.getIndexes()`

2. **Add Redis caching** (optional)
   ```bash
   npm install redis
   ```
   
   Cache search results, geocoding results, etc.

3. **Enable compression**
   ```typescript
   import compression from 'compression';
   app.use(compression());
   ```

4. **Set up CDN** for static assets (if you add a frontend)

### 8. Backup Strategy

1. **MongoDB backups**
   - MongoDB Atlas: Automatic backups enabled by default
   - Self-hosted: Set up daily backups with `mongodump`

2. **Backup script**
   ```bash
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   mongodump --uri="$MONGODB_URI" --out="/backups/leaseiq_$DATE"
   ```

3. **Store backups offsite** (S3, Backblaze B2)

### 9. Scaling Considerations

#### Horizontal Scaling

1. **Load balancer** (nginx, AWS ALB)
2. **Multiple API instances** behind load balancer
3. **Separate cron job server**
4. **Redis for distributed rate limiting**

#### Vertical Scaling

1. **Increase server resources** (CPU, RAM)
2. **Optimize MongoDB queries**
3. **Add database read replicas**

### 10. Post-Deployment

1. **Verify all endpoints**
   ```bash
   curl https://api.leaseiq.app/health
   curl https://api.leaseiq.app/api/search/recent
   ```

2. **Test alert system**
   ```bash
   curl -X POST https://api.leaseiq.app/api/alerts/process
   ```

3. **Monitor logs**
   ```bash
   pm2 logs leaseiq-api
   pm2 logs leaseiq-alerts
   ```

4. **Set up monitoring alerts**
   - API downtime
   - High error rates
   - Database connection issues
   - Email delivery failures

### 11. Maintenance

#### Daily
- Check error logs
- Monitor API response times
- Verify alert delivery

#### Weekly
- Review scraping job success rates
- Check database size and performance
- Update dependencies (security patches)

#### Monthly
- Review and optimize slow queries
- Clean up old data (optional)
- Review API usage and costs
- Update documentation

### 12. Rollback Plan

If deployment fails:

1. **Revert to previous version**
   ```bash
   pm2 stop all
   git checkout previous-tag
   npm ci --production
   npm run build
   pm2 restart all
   ```

2. **Restore database backup** (if needed)
   ```bash
   mongorestore --uri="$MONGODB_URI" /backups/leaseiq_YYYYMMDD_HHMMSS
   ```

### 13. Cost Estimates (Monthly)

**Minimal Setup:**
- MongoDB Atlas (M0): $0 (free tier)
- Resend: $0 (100 emails/day free)
- Firecrawl: ~$20 (depends on usage)
- OpenRouter: ~$5 (depends on usage)
- VPS (DigitalOcean): $6 (basic droplet)
- **Total: ~$31/month**

**Production Setup:**
- MongoDB Atlas (M10): $57
- Resend: $20 (50k emails/month)
- Firecrawl: ~$100
- OpenRouter: ~$20
- VPS (2GB RAM): $12
- **Total: ~$209/month**

### 14. Support & Troubleshooting

Common issues:

1. **"MongoDB connection failed"**
   - Check MONGODB_URI
   - Verify IP whitelist
   - Check network connectivity

2. **"Email send failed"**
   - Verify RESEND_API_KEY
   - Check email quota
   - Verify sender domain

3. **"Scraping failed"**
   - Check FIRECRAWL_API_KEY
   - Verify API quota
   - Check rate limits

4. **"High memory usage"**
   - Increase server RAM
   - Optimize queries
   - Add pagination

---

## Ready to Deploy?

Follow this checklist and you'll have LeaseIQ running in production in under an hour!

For questions or issues, check the documentation or open an issue on GitHub.
