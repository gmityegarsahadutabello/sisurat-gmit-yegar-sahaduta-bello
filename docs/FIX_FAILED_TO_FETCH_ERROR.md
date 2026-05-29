# 🔧 FIX: "Failed to fetch" Error pada Registrasi

## 🐛 Problem

Saat mencoba registrasi akun jemaat melalui `register.html`, muncul error:
```
Failed to fetch
```

## 🔍 Root Cause Analysis

Error "Failed to fetch" terjadi karena:

1. **Backend Server Tidak Berjalan**
   - Server Express tidak aktif pada port 5000
   - Frontend tidak dapat terhubung ke API `http://localhost:5000`

2. **Express 5.x Compatibility Issues**
   - Express 5.2.1 memiliki masalah stabilitas
   - Server crash saat menerima request pertama
   - Perlu downgrade ke Express 4.18.2 (stable)

3. **Frontend Server Tidak Aktif**
   - HTTP server untuk frontend harus berjalan di port 8080
   - Tanpa frontend server, browser tidak bisa akses `register.html`

## ✅ Solution Applied

### 1. Downgrade Express ke Versi Stable

**File:** `Backend/package.json`

```json
"dependencies": {
  "express": "^4.18.2"  // ✅ Changed from 5.2.1
}
```

### 2. Improved Server Error Handling

**File:** `Backend/server.js`

Menambahkan:
- Error handler untuk JSON parsing
- Global error handler
- Better server initialization dengan explicit host binding
- Error event listeners

```javascript
// JSON parsing error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON' });
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Better server initialization
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`📡 Ready to accept connections`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error(`❌ Server error:`, error);
  }
  process.exit(1);
});
```

## 🚀 How to Fix (Step by Step)

### Step 1: Reinstall Dependencies

```powershell
cd Backend
npm install
```

Ini akan menginstall Express 4.18.2 yang lebih stable.

### Step 2: Start Backend Server

```powershell
# Option A: Run in separate PowerShell window (Recommended)
cd Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node server.js"

# Option B: Run directly
cd Backend
node server.js
```

**Expected Output:**
```
[dotenv@17.2.3] injecting env (2) from .env
✅ Server running on port 5000
🔗 API URL: http://localhost:5000
📡 Ready to accept connections
MongoDB Connected: localhost
```

### Step 3: Start Frontend Server

Open **new PowerShell terminal**:

```powershell
# Option A: Run in separate window (Recommended)
cd Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx http-server -p 8080 -c-1"

# Option B: Run directly
cd Frontend
npx http-server -p 8080 -c-1
```

**Expected Output:**
```
Starting up http-server, serving ./
Available on:
  http://127.0.0.1:8080
  http://192.168.x.x:8080
Hit CTRL-C to stop the server
```

### Step 4: Verify Servers are Running

```powershell
# Check backend
curl.exe http://localhost:5000/
# Expected: {"message":"GMIT Yegar API is running"}

# Check frontend
curl.exe -I http://localhost:8080/
# Expected: HTTP/1.1 200 OK
```

### Step 5: Test Registration

1. Buka browser: `http://localhost:8080/register.html`
2. Isi form:
   - **Rayon**: Rayon A
   - **NIK**: 1234567890123456
   - **Nama**: Test Jemaat
   - **Email**: test@example.com
   - **Password**: test123 (min 6 karakter)
   - **Konfirmasi Password**: test123

3. Klik tombol **"Daftar Sekarang"**

4. Jika berhasil, akan muncul:
   ```
   ✅ Registrasi berhasil. Mengarahkan ke halaman masuk...
   ```

## 🧪 Testing

### Test 1: Backend API Langsung

```powershell
# Create test data file
$json = @{
    nik = "1234567890123465"
    name = "Test Jemaat"
    email = "test.jemaat@example.com"
    password = "test123"
    role = "jemaat"
    rayon = "Rayon A"
} | ConvertTo-Json

$json | Out-File -Encoding UTF8 test-register.json

# Test registration
curl.exe -X POST http://localhost:5000/api/users/register `
  -H "Content-Type: application/json" `
  -d "@test-register.json"
```

**Expected Response:**
```json
{
  "_id": "692f1de8ba41e324ee20ad8f",
  "nik": "1234567890123465",
  "name": "Test Jemaat",
  "email": "test.jemaat@example.com",
  "role": "jemaat",
  "rayon": "Rayon A"
}
```

### Test 2: Frontend API Client

Buka `http://localhost:8080/test-api.html` dan klik tombol "Test Register".

## 🔄 Common Issues & Troubleshooting

### Issue 1: Port 5000 Already in Use

**Error:**
```
❌ Port 5000 is already in use
```

**Solution:**
```powershell
# Kill process on port 5000
Get-Process -Name node | Stop-Process -Force

# Or change port in .env
# Edit Backend/.env:
PORT=5001
```

### Issue 2: MongoDB Not Running

**Error:**
```
MongoServerError: connect ECONNREFUSED
```

**Solution:**
```powershell
# Check MongoDB service
Get-Service -Name MongoDB

# Start if stopped
net start MongoDB

# Or start manually
mongod --dbpath "C:\data\db"
```

### Issue 3: CORS Error

**Error (in browser console):**
```
Access to fetch at 'http://localhost:5000/api/users/register' from origin 'http://localhost:8080' has been blocked by CORS policy
```

**Solution:**
CORS sudah dikonfigurasi di `server.js`. Pastikan:
1. Backend server restart setelah edit `server.js`
2. Browser cache di-clear (Ctrl+Shift+Delete)
3. Hard refresh halaman (Ctrl+F5)

### Issue 4: "Invalid JSON" Error

**Error:**
```json
{"message":"Invalid JSON"}
```

**Solution:**
- Pastikan Content-Type header adalah `application/json`
- Cek format JSON valid (gunakan JSONLint.com)
- Jangan ada trailing comma di JSON

### Issue 5: Duplicate NIK/Email

**Error:**
```json
{"message":"Email atau NIK sudah terdaftar"}
```

**Solution:**
```javascript
// Delete user from MongoDB
use gmit_yegar_db
db.users.deleteOne({ email: "test@example.com" })
// or
db.users.deleteOne({ nik: "1234567890123456" })
```

## 📊 System Architecture

```
┌──────────────────┐         HTTP          ┌──────────────────┐
│   Browser        │ ──────────────────▶   │  Frontend        │
│  (Client)        │   localhost:8080      │  http-server     │
└──────────────────┘                       │  (Static Files)  │
                                           └──────────────────┘
                                                     │
                                                     │ Fetch API
                                                     ▼
                                           ┌──────────────────┐
                                           │   Backend API    │
                                           │   Express 4.x    │
                                           │  localhost:5000  │
                                           └──────────────────┘
                                                     │
                                                     │ Mongoose
                                                     ▼
                                           ┌──────────────────┐
                                           │    MongoDB       │
                                           │  localhost:27017 │
                                           └──────────────────┘
```

## 📝 Checklist Verifikasi

Sebelum test registrasi, pastikan semua ini ✅:

- [ ] MongoDB service running
- [ ] Backend dependencies installed (`npm install` di folder Backend)
- [ ] Backend server running di port 5000
- [ ] Frontend server running di port 8080
- [ ] Backend test endpoint OK: `curl http://localhost:5000/`
- [ ] Frontend test endpoint OK: `curl http://localhost:8080/`
- [ ] Browser bisa akses `http://localhost:8080/register.html`
- [ ] Browser console tidak ada error CORS
- [ ] Network tab menunjukkan request ke `http://localhost:5000/api/users/register`

## 🎯 Expected Behavior

### Successful Registration Flow:

1. **User mengisi form** → Frontend validation
2. **Click "Daftar"** → Button disabled, spinner muncul
3. **API Call** → POST `http://localhost:5000/api/users/register`
4. **Backend Processing:**
   - Validate input
   - Check duplicate NIK/email
   - Hash password dengan bcrypt
   - Save to MongoDB
   - Return user object (without password)
5. **Frontend Response:**
   - Show success alert
   - Redirect ke `index.html` setelah 1.2 detik
6. **User can login** dengan email + password yang baru dibuat

## 🔐 Security Notes

1. **Password Hashing:** Passwords di-hash menggunakan bcryptjs sebelum disimpan
2. **Input Validation:** 
   - NIK: hanya angka, min 6 digit
   - Email: format valid
   - Password: minimal 6 karakter
3. **Duplicate Prevention:** Email dan NIK harus unique
4. **CORS:** Hanya allow localhost (production harus dikonfigurasi)

## 📚 Related Files

- `Backend/server.js` - Main server file
- `Backend/package.json` - Dependencies (Express 4.18.2)
- `Backend/controllers/userController.js` - Registration logic
- `Backend/models/User.js` - User schema with password hashing
- `Frontend/assets/js/api.js` - API client
- `Frontend/assets/js/auth.js` - Registration form handler
- `Frontend/register.html` - Registration page

## 🆘 Still Having Issues?

Jika masih error setelah mengikuti semua langkah:

1. **Check all logs:**
   ```powershell
   # Backend terminal - cek error messages
   # Frontend terminal - cek 404 errors
   # Browser console (F12) - cek JavaScript errors
   ```

2. **Test dengan curl langsung** (bypass frontend):
   ```powershell
   curl.exe -X POST http://localhost:5000/api/users/register `
     -H "Content-Type: application/json" `
     -d '{"nik":"1111111111111111","name":"Test","email":"test@test.com","password":"test123","role":"jemaat","rayon":"Rayon A"}'
   ```

3. **Restart semua service:**
   ```powershell
   # Stop all
   Get-Process -Name node | Stop-Process -Force
   net stop MongoDB
   
   # Start all
   net start MongoDB
   cd Backend; node server.js  # Terminal 1
   cd Frontend; npx http-server -p 8080 -c-1  # Terminal 2
   ```

4. **Check MongoDB data:**
   ```powershell
   mongosh
   use gmit_yegar_db
   db.users.find().pretty()  # Should show registered users
   ```

---

## ✅ Summary

**Problem:** Failed to fetch error
**Cause:** Express 5.x instability + server not running properly
**Solution:** Downgrade to Express 4.18.2 + improved error handling
**Result:** Registration works perfectly ✅

**Next Steps:**
1. Start both servers (backend + frontend)
2. Test registration di browser
3. Verify user tersimpan di MongoDB
4. Test login dengan akun baru
