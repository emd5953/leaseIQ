@echo off
echo 🌿 LeaseIQ Setup Script
echo =======================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 24.x first.
    exit /b 1
)

echo ✅ Node.js is installed
node --version
echo.

REM Install backend dependencies
echo 📦 Installing backend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install backend dependencies
    exit /b 1
)
echo ✅ Backend dependencies installed
echo.

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install frontend dependencies
    exit /b 1
)
cd ..
echo ✅ Frontend dependencies installed
echo.

REM Check if .env exists
if not exist .env (
    echo ⚠️  No .env file found. Please create one with your API keys.
    echo    See .env.example for required variables.
) else (
    echo ✅ .env file found
)
echo.

REM Check if frontend/.env.local exists
if not exist frontend\.env.local (
    echo 📝 Creating frontend/.env.local...
    echo NEXT_PUBLIC_API_URL=http://localhost:3001 > frontend\.env.local
    echo ✅ Created frontend/.env.local
) else (
    echo ✅ frontend/.env.local exists
)
echo.

echo 🎉 Setup complete!
echo.
echo To start the application:
echo   npm start              # Start both backend and frontend
echo   npm run start:backend  # Start backend only (port 3001)
echo   npm run start:frontend # Start frontend only (port 3000)
echo.
echo Access points:
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:3001
echo   Health:    http://localhost:3001/health
echo.
echo Documentation:
echo   Frontend Guide:  FRONTEND_GUIDE.md
echo   Setup Guide:     frontend/SETUP.md
echo   Style Guide:     http://localhost:3000/styleguide (after starting)
echo.
echo Happy coding! 🚀
pause
