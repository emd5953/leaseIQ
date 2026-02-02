# Vercel Deployment Setup

## Required Environment Variables

Add these environment variables in your Vercel project settings:

### 1. Go to Vercel Dashboard
- Navigate to your project: https://vercel.com/dashboard
- Select your project (lease-iq)
- Go to Settings → Environment Variables

### 2. Add Environment Variables

#### NEXT_PUBLIC_GOOGLE_CLIENT_ID
- **Value**: Copy from `frontend/.env` file
- **Environment**: Production, Preview, Development (select all)
- **Required for**: Google OAuth authentication

#### NEXT_PUBLIC_API_URL
- **Value**: Copy from `frontend/.env` file
- **Environment**: Production, Preview, Development (select all)
- **Required for**: Backend API connection

### 3. Redeploy

After adding the environment variables:
1. Go to Deployments tab
2. Click the three dots (...) on the latest deployment
3. Select "Redeploy"
4. Check "Use existing Build Cache" (optional)
5. Click "Redeploy"

## Vercel Analytics

Vercel Analytics is already installed and configured. It will automatically start tracking:
- Page views
- Web Vitals (CLS, FID, LCP, FCP, TTFB)
- Custom events (if you add them later)

No additional configuration needed - it works automatically on Vercel deployments.

## Troubleshooting

### Google OAuth Error
If you see "Missing required parameter client_id":
- Verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in Vercel
- Ensure it's set for all environments (Production, Preview, Development)
- Redeploy after adding the variable

### API Connection Issues
If API calls fail:
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check that your backend at https://leaseiq.onrender.com is running
- Verify CORS is configured on the backend to allow your Vercel domain

## Google OAuth Configuration

Make sure your Google OAuth app is configured with the correct redirect URIs:
- https://lease-iq.vercel.app
- https://lease-iq.vercel.app/api/auth/callback/google
- Any preview deployment URLs you want to test

Update these in Google Cloud Console:
1. Go to https://console.cloud.google.com
2. Select your project
3. Navigate to APIs & Services → Credentials
4. Edit your OAuth 2.0 Client ID
5. Add authorized JavaScript origins and redirect URIs
