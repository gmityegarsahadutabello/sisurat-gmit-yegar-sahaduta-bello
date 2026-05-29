# ✅ CHECKLIST - MONGODB MIGRATION

## 📋 Pre-Setup Checklist

- [ ] **MongoDB terinstall**
  - Download: https://www.mongodb.com/try/download/community
  - Atau install via Chocolatey: `choco install mongodb`

- [ ] **MongoDB Service berjalan**
  - Check: `net start MongoDB`
  - Atau manual: `mongod --dbpath "C:\data\db"`

- [ ] **Node.js terinstall** (v14 atau lebih baru)
  - Check: `node --version`
  - Download: https://nodejs.org/

- [ ] **Port 5000 tersedia** (untuk backend)
  - Check: `netstat -ano | findstr :5000`

- [ ] **Port 8080 tersedia** (untuk frontend)
  - Check: `netstat -ano | findstr :8080`

---

## 🚀 Setup Checklist

### Automated Setup (Recommended)

- [ ] **Run setup script**
  ```powershell
  .\setup.ps1
  ```

- [ ] **Script berhasil?**
  - ✅ MongoDB connected
  - ✅ Dependencies installed
  - ✅ Database seeded
  - ✅ .env created

---

### Manual Setup (Alternative)

- [ ] **Install Backend Dependencies**
  ```powershell
  cd Backend
  npm install
  ```

- [ ] **Create .env file**
  ```
  MONGO_URI=mongodb://localhost:27017/gmit_yegar_db
  PORT=5000
  ```

- [ ] **Seed Database**
  ```powershell
  node seeder.js -i
  ```

- [ ] **Start Backend**
  ```powershell
  node server.js
  ```
  Expected output: `✅ MongoDB Connected` + `🚀 Server running on port 5000`

- [ ] **Start Frontend** (terminal baru)
  ```powershell
  cd Frontend
  npx http-server -p 8080 -c-1
  ```

---

## 🧪 Testing Checklist

### Backend API Testing

- [ ] **Test server health**
  ```powershell
  curl http://localhost:5000/
  ```
  Expected: `{"message":"GMIT Yegar API is running"}`

- [ ] **Test user login**
  ```powershell
  curl -X POST http://localhost:5000/api/users/login `
    -H "Content-Type: application/json" `
    -d '{"email":"admin@gmityegar.com","password":"admin123"}'
  ```
  Expected: JSON with user data (no password)

- [ ] **Test get pengajuan**
  ```powershell
  curl http://localhost:5000/api/pengajuan
  ```
  Expected: Array of pengajuan (should have 2 sample items)

- [ ] **Test get users**
  ```powershell
  curl http://localhost:5000/api/users
  ```
  Expected: Array of users (should have 8 users)

---

### Frontend Testing

- [ ] **Open browser**
  - URL: http://localhost:8080
  - Should show login page

- [ ] **Test Login - Admin**
  - Email: `admin@gmityegar.com`
  - Password: `admin123`
  - Should redirect to admin dashboard

- [ ] **Test Login - Jemaat**
  - Email: `jemaat.a@gmityegar.com`
  - Password: `jemaat123`
  - Should redirect to jemaat dashboard

- [ ] **Test Logout**
  - Click logout
  - Should redirect to login page

---

### Database Testing

- [ ] **Connect to MongoDB**
  ```powershell
  mongosh
  ```

- [ ] **Check database**
  ```javascript
  use gmit_yegar_db
  show collections
  ```
  Expected: `notifications`, `pengajuans`, `users`

- [ ] **Check users count**
  ```javascript
  db.users.countDocuments()
  ```
  Expected: 8

- [ ] **Check pengajuan count**
  ```javascript
  db.pengajuans.countDocuments()
  ```
  Expected: 2

- [ ] **Check notifications count**
  ```javascript
  db.notifications.countDocuments()
  ```
  Expected: 2

- [ ] **View sample user**
  ```javascript
  db.users.findOne({ role: 'admin' })
  ```
  Expected: Admin user object

---

## 📱 Functional Testing Checklist

### Jemaat Role

- [ ] **Login sebagai Jemaat**
  - Email: `jemaat.a@gmityegar.com` / `jemaat123`

- [ ] **Create Pengajuan Baru**
  - Pilih tipe surat (baptis, nikah, dll)
  - Isi form
  - Submit
  - Should show success message

- [ ] **View Pengajuan List**
  - Should only show own submissions
  - Check status, tanggal, dll

- [ ] **View Pengajuan Detail**
  - Click salah satu pengajuan
  - Should show complete details

- [ ] **Check Notifications**
  - Should see notification badge
  - Click to view notifications

---

### Koordinator Role

- [ ] **Login sebagai Koordinator**
  - Email: `koor.a@gmityegar.com` / `koor123`

- [ ] **View Surat Masuk**
  - Should see submissions from own rayon only
  - Check filtering by rayon

- [ ] **Verify Pengajuan**
  - Select a submission
  - Click Verifikasi
  - Add note
  - Confirm
  - Should update status

- [ ] **Reject Pengajuan**
  - Select a submission
  - Click Tolak
  - Add rejection note
  - Confirm
  - Should update status

---

### Tata Usaha Role

- [ ] **Login sebagai Tata Usaha**
  - Email: `tu@gmityegar.com` / `tu123456`

- [ ] **View Verified Submissions**
  - Should see all verified pengajuan

- [ ] **Upload File**
  - Select a pengajuan
  - Upload PDF/JPG file
  - Should preview correctly
  - Save

- [ ] **Create Draft Surat**
  - Type draft text
  - Save draft

- [ ] **Disposisi to Sekretaris**
  - Forward to Sekretaris
  - Should update status
  - Should create notification

---

### Sekretaris Role

- [ ] **Login sebagai Sekretaris**
  - Email: `sekretaris@gmityegar.com` / `sekretaris123`

- [ ] **View Surat Masuk**
  - Should see dispositions to Sekretaris

- [ ] **Validate Surat**
  - Select a surat
  - Click Validasi
  - Should forward to Pendeta

- [ ] **Return Surat**
  - Select a surat
  - Click Kembalikan
  - Add return note
  - Should notify TU

---

### Pendeta Role

- [ ] **Login sebagai Pendeta**
  - Email: `pendeta@gmityegar.com` / `pendeta123`

- [ ] **View Surat Masuk**
  - Should see dispositions to Pendeta

- [ ] **Final Validate**
  - Select a surat
  - Click Validasi
  - Should generate nomor surat
  - Should notify TU

- [ ] **Return Surat**
  - Select a surat
  - Click Kembalikan
  - Add return note
  - Should notify TU/Sek

---

### Admin Role

- [ ] **Login sebagai Admin**
  - Email: `admin@gmityegar.com` / `admin123`

- [ ] **View Dashboard**
  - Should see statistics
  - Count by role

- [ ] **Manage Users**
  - View all users
  - Create new user
  - Edit user
  - Delete user (test account only!)

- [ ] **View All Pengajuan**
  - Should see all submissions
  - Filter by status, type, etc.

---

## 🔍 Data Integrity Checklist

- [ ] **Check Denormalized Data**
  ```javascript
  db.pengajuans.findOne({}, { user_id: 1, user_nik: 1, user_nama: 1 })
  ```
  Should have all user fields

- [ ] **Check Timeline**
  ```javascript
  db.pengajuans.findOne({}, { timeline: 1 })
  ```
  Should have at least 1 timeline entry

- [ ] **Check Notifications**
  ```javascript
  db.notifications.find({ to_role: 'koordinator' })
  ```
  Should have notifications for koordinator

- [ ] **Check Indexes**
  ```javascript
  db.users.getIndexes()
  db.pengajuans.getIndexes()
  db.notifications.getIndexes()
  ```
  Should have multiple indexes per collection

---

## 🛡️ Security Checklist

- [ ] **Password hashing works**
  - Create new user via registration
  - Check in database: `db.users.findOne({ email: 'test@test.com' }, { password: 1 })`
  - Password should start with `$2a$` (bcrypt hash)

- [ ] **Login validation works**
  - Try wrong password → should reject
  - Try correct password → should accept

- [ ] **Duplicate prevention works**
  - Try register with existing email → should reject
  - Try register with existing NIK → should reject

- [ ] **Role-based access**
  - Jemaat cannot see other jemaat's submissions
  - Koordinator only sees own rayon
  - Staff sees all (TU, Sek, Pendeta)

---

## 📊 Performance Checklist

- [ ] **Query performance**
  - Test filter by rayon → should be fast (indexed)
  - Test filter by status → should be fast (indexed)
  - Test filter by user_id → should be fast (indexed)

- [ ] **Large dataset test** (optional)
  - Create 100+ pengajuan
  - Check query speed
  - Should still be fast with indexes

---

## 📝 Documentation Checklist

- [ ] **README.md exists**
  - Has quick start guide
  - Has test accounts
  - Has troubleshooting

- [ ] **MONGODB_COMPLETE_GUIDE.md exists**
  - Has complete setup instructions
  - Has API documentation
  - Has database schema

- [ ] **WORKFLOW_DIAGRAM.md exists**
  - Has architecture diagram
  - Has workflow diagram
  - Has data flow

- [ ] **RINGKASAN_PERUBAHAN.md exists**
  - Lists all changes
  - Has migration notes

---

## 🚨 Troubleshooting Checklist

### If Backend Won't Start

- [ ] Check MongoDB is running: `net start MongoDB`
- [ ] Check .env file exists and correct
- [ ] Check port 5000 is available
- [ ] Check dependencies installed: `npm install`
- [ ] Check for errors in server.js

### If Frontend Can't Connect

- [ ] Check backend is running: `curl http://localhost:5000/`
- [ ] Check browser console for errors
- [ ] Check Network tab in DevTools
- [ ] Check CORS is enabled in backend

### If Login Fails

- [ ] Check database is seeded: `node seeder.js -i`
- [ ] Check email/password correct
- [ ] Check user exists: `db.users.findOne({ email: '...' })`
- [ ] Check password is hashed in database

### If Data Not Showing

- [ ] Check API endpoint returns data: `curl http://localhost:5000/api/pengajuan`
- [ ] Check browser console for errors
- [ ] Check MongoDB has data: `db.pengajuans.find()`
- [ ] Check filters are not too restrictive

---

## ✅ Final Checklist

- [ ] **All tests passing**
- [ ] **No console errors**
- [ ] **All roles working**
- [ ] **All workflows tested**
- [ ] **Database has sample data**
- [ ] **Documentation reviewed**

---

## 🎉 Success Criteria

System is ready when:

1. ✅ Backend server running (port 5000)
2. ✅ Frontend server running (port 8080)
3. ✅ MongoDB connected (localhost:27017)
4. ✅ All 8 test accounts can login
5. ✅ Jemaat can create submission
6. ✅ Koordinator can verify/reject
7. ✅ TU can upload file
8. ✅ Sekretaris can validate/return
9. ✅ Pendeta can final validate
10. ✅ Notifications working
11. ✅ No localStorage dependency
12. ✅ All data persisted in MongoDB

---

**Status:** ⬜ Not Started | 🔄 In Progress | ✅ Complete | ❌ Failed

---

**Jika semua checklist ✅, sistem sudah 100% siap digunakan!** 🚀
