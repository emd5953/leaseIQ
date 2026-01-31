#!/bin/bash

echo "🌿 LeaseIQ Setup Script"
echo "======================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi
echo "✅ Backend dependencies installed"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi
cd ..
echo "✅ Frontend dependencies installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Please create one with your API keys."
    echo "   See .env.example for required variables."
else
    echo "✅ .env file found"
fi
echo ""

# Check if frontend/.env.local exists
if [ ! -f frontend/.env.local ]; then
    echo "📝 Creating frontend/.env.local..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > frontend/.env.local
    echo "✅ Created frontend/.env.local"
else
    echo "✅ frontend/.env.local exists"
fi
echo ""

echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo "  npm start              # Start both backend and frontend"
echo "  npm run start:backend  # Start backend only (port 3001)"
echo "  npm run start:frontend # Start frontend only (port 3000)"
echo ""
echo "Access points:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:3001"
echo "  Health:    http://localhost:3001/health"
echo ""
echo "Documentation:"
echo "  Frontend Guide:  FRONTEND_GUIDE.md"
echo "  Setup Guide:     frontend/SETUP.md"
echo "  Style Guide:     http://localhost:3000/styleguide (after starting)"
echo ""
echo "Happy coding! 🚀"
