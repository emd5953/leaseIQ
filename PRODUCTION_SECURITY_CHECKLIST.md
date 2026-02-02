# Production Security Checklist

## ✅ COMPLETED

- [x] Rate limiting on all endpoints (20 req/15min for AI endpoints)
- [x] CORS restricted to specific frontend domain
- [x] Authentication required on expensive AI endpoints
- [x] SSL certificate validation in production
- [x] Input sanitization middleware
- [x] File upload size limits (10MB)
- [x] MongoDB connection with TLS

## ⚠️ CRITICAL - FIX BEFORE DEPLOY

### 1. JWT Secret (URGENT)
**Current:** `leaseiq-production-jwt-secret-2026` (too weak)
**Required:** Generate a strong 32+ character random secret

```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then update in Render dashboard:
```
JWT_SECRET=<generated-64-char-hex-string>
```

### 2. Environment Variables
**NEVER commit .env to git!**

Your .env file contains real API keys. Make sure:
- `.env` is in `.gitignore` ✅ (already there)
- Remove .env from git history if committed
- Set all secrets in Render dashboard only

### 3. Frontend URL
Add to Render environment variables:
```
FRONTEND_URL=https://your-actual-frontend-domain.com
```

## 🔒 SECURITY LAYERS

### Layer 1: CORS
- ✅ Only allows requests from your frontend domain in production
- ⚠️ Make sure `FRONTEND_URL` env var is set on Render

### Layer 2: Rate Limiting
**Production limits:**
- Search: 60 req/min
- Standard: 100 req/15min  
- AI endpoints: 20 req/15min
- Webhooks: 100 req/min

### Layer 3: Authentication
**Protected endpoints (require JWT):**
- `/api/research/*` - AI research (OpenRouter)
- `/api/lease/*` - Lease analysis (Reducto + OpenRouter)
- `/api/floorplan/*` - Floor plan analysis (OpenRouter)
- `/api/property/*` - Combined analysis (multiple APIs)
- `/api/alerts/*` - Alert management (Resend)
- `/api/user/*` - User data

**Public endpoints:**
- `/api/search/*` - Listing search (read-only, rate limited)
- `/api/auth/*` - Login/signup
- `/health` - Health check

### Layer 4: Input Validation
- ✅ Email validation
- ✅ ObjectId validation
- ✅ URL validation
- ✅ Body sanitization

## 💰 COST PROTECTION

**Without auth, someone could:**
- Hit `/api/research/:id` 20 times/15min = 1,920 req/day
- Each request costs ~$0.01-0.05 in API fees
- **Potential cost: $20-100/day from a single IP**

**With auth (current):**
- Users must sign in with Google OAuth
- Can track usage per user
- Can ban abusive users
- Can implement per-user rate limits

## 📊 MONITORING RECOMMENDATIONS

### 1. Track API Usage
Monitor these metrics:
- Requests per endpoint
- Requests per user
- API costs per user
- Failed auth attempts

### 2. Set Up Alerts
Alert when:
- API costs exceed $X/day
- Single user makes >100 AI requests/day
- Failed auth attempts >50/hour
- Rate limit hits >1000/hour

### 3. Log Suspicious Activity
- Multiple failed logins
- Rapid-fire AI requests
- Large file uploads
- Unusual traffic patterns

## 🚀 DEPLOYMENT STEPS

1. **Generate strong JWT secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Set environment variables in Render:**
   - `NODE_ENV=production`
   - `JWT_SECRET=<your-64-char-secret>`
   - `FRONTEND_URL=https://your-frontend.com`
   - All API keys (Firecrawl, OpenRouter, Resend, etc.)

3. **Deploy backend**
   ```bash
   git push origin main
   # Render auto-deploys
   ```

4. **Test authentication**
   - Try accessing `/api/research/:id` without token → should get 401
   - Login with Google → get JWT token
   - Try with token → should work

5. **Monitor costs**
   - Check OpenRouter dashboard
   - Check Reducto usage
   - Check Resend email count

## 🔐 ADDITIONAL HARDENING (Optional)

### Per-User Rate Limits
Track usage per userId instead of IP:

```typescript
// In rateLimiter.ts
export const perUserLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50, // 50 AI requests per day per user
  keyGenerator: (req: AuthRequest) => req.userId || req.ip,
});
```

### API Key for Webhooks
Add secret key validation for webhook endpoints:

```typescript
// In webhook.routes.ts
router.post('/firecrawl', (req, res, next) => {
  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.FIRECRAWL_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }
  next();
});
```

### Request Logging
Log all AI requests for audit:

```typescript
// After auth middleware
router.use((req: AuthRequest, res, next) => {
  console.log(`[AI Request] User: ${req.userId}, Endpoint: ${req.path}`);
  next();
});
```

## ✅ FINAL CHECKLIST

Before going live:

- [ ] Strong JWT secret set in Render
- [ ] FRONTEND_URL set in Render
- [ ] All API keys set in Render (not in code)
- [ ] .env not committed to git
- [ ] Test auth on all AI endpoints
- [ ] Monitor API costs for 24 hours
- [ ] Set up cost alerts
- [ ] Document how to ban abusive users

## 🆘 IF YOU GET ABUSED

1. **Check logs** - Find the userId making excessive requests
2. **Ban user** - Add to banned users list in database
3. **Revoke tokens** - Change JWT secret (logs everyone out)
4. **Tighten limits** - Reduce rate limits temporarily
5. **Contact APIs** - Report abuse to OpenRouter/Reducto

## 📞 SUPPORT

- OpenRouter: https://openrouter.ai/docs
- Reducto: https://reducto.ai/docs
- Resend: https://resend.com/docs
- Render: https://render.com/docs
