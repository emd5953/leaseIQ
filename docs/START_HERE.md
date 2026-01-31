# 🚀 Start Here - LeaseIQ Quick Start

## ✅ Everything is Ready!

Your LeaseIQ application is fully set up and ready to run.

## 🎯 One Command to Start Everything

```bash
npm start
```

That's it! This single command will:
1. ✅ Start the backend API on http://localhost:3001
2. ✅ Start the frontend on http://localhost:3000
3. ✅ Connect to MongoDB
4. ✅ Set up all API routes

## 🌐 Access Your Application

Once started, open your browser to:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Style Guide**: http://localhost:3000/styleguide

## 📱 What You'll See

### Frontend (Port 3000)
- Beautiful home page with Botanical/Organic design
- Search page with filters
- Listing detail pages
- Research tool
- Lease analyzer
- Dashboard
- How it works page

### Backend (Port 3001)
- REST API endpoints
- MongoDB connection
- Search functionality
- Research features
- Lease analysis
- Email notifications

## 🛑 To Stop

Press `Ctrl+C` in the terminal to stop both servers.

## 🔧 Alternative Commands

If you want to run servers separately:

```bash
# Backend only (port 3001)
npm run start:backend

# Frontend only (port 3000)
npm run start:frontend

# Alert cron job
npm run alerts
```

## 📚 Next Steps

1. **Explore the app**: Visit http://localhost:3000
2. **Check the style guide**: http://localhost:3000/styleguide
3. **Read the docs**: See `FRONTEND_GUIDE.md` for complete documentation
4. **Start building**: Modify components in `frontend/src/components/`

## 🎨 Design System

The app uses a **Botanical/Organic** design system:
- Warm, earthy colors (sage green, terracotta, alabaster)
- Elegant typography (Playfair Display + Source Sans 3)
- Rounded corners and organic shapes
- Graceful animations
- Paper grain texture

## 🔌 API Endpoints

All available at http://localhost:3001/api:

- `GET /api/search` - Search listings
- `GET /api/search/recent` - Recent listings
- `GET /api/search/:id` - Get listing by ID
- `POST /api/research/:listingId` - Research a listing
- `POST /api/lease/analyze` - Analyze lease text

## 📖 Documentation

- `README.md` - Project overview
- `FRONTEND_GUIDE.md` - Complete frontend guide
- `QUICK_REFERENCE.md` - Quick reference
- `VISUAL_SHOWCASE.md` - Design showcase
- `DEPLOYMENT_READY.md` - Deployment guide

## ✨ Features

### Search & Browse
- Search across multiple listing sources
- Advanced filters (price, beds, baths, location)
- Beautiful listing cards
- Detailed listing pages

### Research
- Landlord reviews
- Building violations
- Neighborhood insights
- Email reports

### Lease Analysis
- AI-powered analysis
- Red flag detection
- Plain English explanations
- Email delivery

### Dashboard
- Saved listings
- Active alerts
- Recent activity
- Quick actions

## 🐛 Troubleshooting

### Backend won't start
- Check MongoDB connection in `.env`
- Ensure port 3001 is available
- Verify all API keys are set

### Frontend won't start
- Check `frontend/.env.local` exists
- Ensure port 3000 is available
- Run `npm install` in frontend directory

### Can't connect to API
- Verify backend is running on port 3001
- Check `frontend/.env.local` has correct API URL
- Ensure CORS is enabled

## 🎉 You're All Set!

Run `npm start` and start exploring your beautiful LeaseIQ application!

---

**Need more help?** Check `QUICK_REFERENCE.md` or `FRONTEND_GUIDE.md`
