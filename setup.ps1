# GMIT YEGAR - MongoDB Setup Script
# Automated setup for Windows PowerShell

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  GMIT YEGAR - SETUP MONGODB SYSTEM" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if MongoDB is installed
Write-Host "🔍 Checking MongoDB installation..." -ForegroundColor Yellow
$mongoInstalled = Get-Command mongod -ErrorAction SilentlyContinue
if (-not $mongoInstalled) {
    Write-Host "❌ MongoDB is not installed!" -ForegroundColor Red
    Write-Host "Please install MongoDB from: https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ MongoDB is installed`n" -ForegroundColor Green

# Check if MongoDB is running
Write-Host "🔍 Checking MongoDB service..." -ForegroundColor Yellow
$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -eq 'Running') {
    Write-Host "✅ MongoDB service is running`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  MongoDB service is not running" -ForegroundColor Yellow
    Write-Host "Attempting to start MongoDB service..." -ForegroundColor Yellow
    try {
        Start-Service -Name MongoDB -ErrorAction Stop
        Write-Host "✅ MongoDB service started`n" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to start MongoDB service" -ForegroundColor Red
        Write-Host "Please start MongoDB manually: net start MongoDB" -ForegroundColor Yellow
        Write-Host "Or run: mongod --dbpath ""C:\data\db""`n" -ForegroundColor Yellow
        exit 1
    }
}

# Test MongoDB connection
Write-Host "🔍 Testing MongoDB connection..." -ForegroundColor Yellow
try {
                                                                                = mongosh --eval "db.version()" --quiet 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MongoDB connection successful`n" -ForegroundColor Green
    } else {
        throw "Connection failed"
    }
} catch {
    Write-Host "❌ Cannot connect to MongoDB" -ForegroundColor Red
    Write-Host "Please ensure MongoDB is running on localhost:27017`n" -ForegroundColor Yellow
    exit 1
}

# Install Backend Dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Push-Location Backend
try {
    if (Test-Path "package.json") {
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Backend dependencies installed`n" -ForegroundColor Green
        } else {
            throw "npm install failed"
        }
    } else {
        Write-Host "❌ package.json not found in Backend folder" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Check .env file
Write-Host "🔍 Checking .env configuration..." -ForegroundColor Yellow
if (Test-Path "Backend\.env") {
    Write-Host "✅ .env file exists`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found, creating..." -ForegroundColor Yellow
    @"
MONGO_URI=mongodb://localhost:27017/gmit_yegar_db
PORT=5000
"@ | Out-File -FilePath "Backend\.env" -Encoding UTF8
    Write-Host "✅ .env file created`n" -ForegroundColor Green
}

# Seed Database
Write-Host "🌱 Do you want to seed the database with sample data?" -ForegroundColor Yellow
Write-Host "   This will DELETE all existing data and create test accounts." -ForegroundColor Yellow
$response = Read-Host "   Continue? (y/N)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "`n📥 Seeding database..." -ForegroundColor Yellow
    Push-Location Backend
    node seeder.js -i
    Pop-Location
    Write-Host ""
} else {
    Write-Host "⏭️  Skipping database seeding`n" -ForegroundColor Gray
}

# Setup Complete
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Start Backend Server:" -ForegroundColor White
Write-Host "   cd Backend" -ForegroundColor Gray
Write-Host "   node server.js`n" -ForegroundColor Gray

Write-Host "2. Start Frontend Server:" -ForegroundColor White
Write-Host "   cd Frontend" -ForegroundColor Gray
Write-Host "   npx http-server -p 8080 -c-1`n" -ForegroundColor Gray

Write-Host "3. Open Browser:" -ForegroundColor White
Write-Host "   http://localhost:8080`n" -ForegroundColor Gray

if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "📝 Test Accounts:" -ForegroundColor Yellow
    Write-Host "   Admin:      admin@gmityegar.com / admin123" -ForegroundColor Gray
    Write-Host "   Tata Usaha: tu@gmityegar.com / tu123456" -ForegroundColor Gray
    Write-Host "   Sekretaris: sekretaris@gmityegar.com / sekretaris123" -ForegroundColor Gray
    Write-Host "   Pendeta:    pendeta@gmityegar.com / pendeta123" -ForegroundColor Gray
    Write-Host "   Koordinator: koor.a@gmityegar.com / koor123" -ForegroundColor Gray
    Write-Host "   Jemaat:     jemaat.a@gmityegar.com / jemaat123`n" -ForegroundColor Gray
}

Write-Host "📚 Documentation: MONGODB_COMPLETE_GUIDE.md`n" -ForegroundColor Cyan

# Ask if user wants to start servers now
$startNow = Read-Host "Do you want to start the servers now? (y/N)"
if ($startNow -eq 'y' -or $startNow -eq 'Y') {
    Write-Host "`n🚀 Starting servers...`n" -ForegroundColor Green
    
    # Start backend in new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\Backend'; node server.js"
    Start-Sleep -Seconds 2
    
    # Start frontend in new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\Frontend'; npx http-server -p 8080 -c-1"
    Start-Sleep -Seconds 2
    
    Write-Host "✅ Servers started in separate windows!" -ForegroundColor Green
    Write-Host "Opening browser in 3 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    Start-Process "http://localhost:8080"
}

Write-Host "`n✅ All done! Happy coding! 🎉`n" -ForegroundColor Green
