# 🔧 FIX: Error "next is not a function" saat Registrasi

## ❌ Problem
Saat klik tombol "Daftar" di halaman registrasi, muncul error:
```
next is not a function
```

## 🔍 Root Cause
Error terjadi karena penggunaan callback `next()` di Mongoose pre-save hooks yang sudah deprecated di Mongoose versi 9.0.0.

Di Mongoose versi terbaru, async middleware **tidak memerlukan** parameter `next()` dan tidak perlu memanggil `next()`.

## ✅ Solution Applied

### Files Fixed:

1. **Backend/models/User.js**
   - ❌ Before: `userSchema.pre('save', async function(next) { ... next(); })`
   - ✅ After: `userSchema.pre('save', async function() { ... })`

2. **Backend/models/Pengajuan.js**
   - ❌ Before: `pengajuanSchema.pre('save', function(next) { ... next(); })`
   - ✅ After: `pengajuanSchema.pre('save', function() { ... })`

3. **Backend/models/Notification.js**
   - ❌ Before: `notificationSchema.pre('save', function(next) { ... next(); })`
   - ✅ After: `notificationSchema.pre('save', function() { ... })`

## 🚀 How to Apply Fix

### Step 1: Restart Backend Server

```powershell
# Stop current server (Ctrl+C di terminal backend)

# Start backend lagi
cd Backend
node server.js
```

**Expected Output:**
```
✅ MongoDB Connected
🚀 Server running on port 5000
```

### Step 2: Test Registrasi

1. Buka browser: `http://localhost:8080/register.html`
2. Isi form:
   - **Rayon**: Pilih rayon
   - **NIK**: 16 digit (contoh: `1234567890123464`)
   - **Nama Lengkap**: Nama Anda
   - **Email**: Email valid (contoh: `test@example.com`)
   - **Password**: Min 6 karakter
   - **Konfirmasi Password**: Sama dengan password

3. Klik **"Daftar"**

**Expected Result:**
- ✅ Notifikasi sukses: "Registrasi berhasil!"
- ✅ Redirect ke halaman login
- ✅ Data tersimpan di MongoDB

### Step 3: Verify di Database

```powershell
# Connect ke MongoDB
mongosh

# Switch database
use gmit_yegar_db

# Check user baru
db.users.find({ email: "test@example.com" }).pretty()
```

**Expected Output:**
```javascript
{
  _id: ObjectId("..."),
  nik: "1234567890123464",
  name: "Nama Anda",
  email: "test@example.com",
  password: "$2a$10$...",  // Hashed password
  role: "jemaat",
  rayon: "Rayon A",
  createdAt: ISODate("2024-12-03..."),
  updatedAt: ISODate("2024-12-03...")
}
```

### Step 4: Test Login

1. Buka: `http://localhost:8080/index.html`
2. Login dengan email dan password yang baru didaftarkan
3. Should redirect to jemaat dashboard

---

## 🧪 Additional Testing

### Test API Directly (Optional)

```powershell
# Test register via API
curl -X POST http://localhost:5000/api/users/register `
  -H "Content-Type: application/json" `
  -d '{
    "nik": "1234567890123465",
    "name": "Test User 2",
    "email": "test2@example.com",
    "password": "test123",
    "role": "jemaat",
    "rayon": "Rayon A"
  }'
```

**Expected Response:**
```json
{
  "_id": "...",
  "nik": "1234567890123465",
  "name": "Test User 2",
  "email": "test2@example.com",
  "role": "jemaat",
  "rayon": "Rayon A"
}
```

### Test Login via API

```powershell
curl -X POST http://localhost:5000/api/users/login `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test2@example.com",
    "password": "test123"
  }'
```

---

## 📋 Checklist

- [ ] Backend server direstart
- [ ] Server running tanpa error
- [ ] Buka halaman register
- [ ] Isi form dengan data valid
- [ ] Klik "Daftar" - tidak ada error
- [ ] Muncul notifikasi sukses
- [ ] Redirect ke login page
- [ ] Cek database - user baru ada
- [ ] Test login dengan akun baru
- [ ] Login berhasil, redirect ke dashboard

---

## 🔍 Troubleshooting

### Error masih muncul setelah restart?

1. **Clear browser cache:**
   - Ctrl+Shift+Delete
   - Clear cache & cookies

2. **Hard refresh:**
   - Ctrl+F5

3. **Check backend logs:**
   - Lihat console terminal backend
   - Pastikan tidak ada error saat startup

4. **Verify MongoDB connection:**
   ```powershell
   mongosh
   show dbs
   ```

5. **Check port conflicts:**
   ```powershell
   netstat -ano | findstr :5000
   ```

### Duplicate error (Email/NIK already exists)?

```powershell
# Delete test user dari database
mongosh

use gmit_yegar_db
db.users.deleteOne({ email: "test@example.com" })
```

### Password tidak ter-hash?

- Pastikan pre-save hook sudah fix (no `next()`)
- Restart backend server
- Try registrasi lagi

---

## 📚 Technical Details

### Mongoose Pre-save Hooks

**Old Way (Deprecated):**
```javascript
userSchema.pre('save', async function(next) {
  // ... do something
  next(); // ❌ Error: next is not a function
});
```

**New Way (Mongoose 9.x):**
```javascript
userSchema.pre('save', async function() {
  // ... do something
  // No need to call next()
});
```

### Why This Changed?

- Mongoose 9.0.0+ automatically handles promise-based middleware
- `next()` callback is only needed for non-async (callback-style) middleware
- For async functions, simply return or throw error

### Reference:
- [Mongoose Middleware Docs](https://mongoosejs.com/docs/middleware.html)
- [Mongoose 9.0.0 Migration Guide](https://mongoosejs.com/docs/migrating_to_9.html)

---

✅ **Fix Applied Successfully!**

Silakan restart backend server dan coba registrasi lagi. Error "next is not a function" seharusnya sudah hilang.
