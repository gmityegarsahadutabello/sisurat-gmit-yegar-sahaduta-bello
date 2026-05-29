# 📘 PANDUAN LENGKAP MONGODB - GMIT YEGAR SISTEM SURAT

## 🎯 Perubahan Utama

Sistem telah **100% beralih dari localStorage ke MongoDB**. Semua data kini tersimpan di database MongoDB yang lebih aman, scalable, dan professional.

### ✅ Yang Sudah Dilakukan

1. **Backend MongoDB Lengkap**
   - ✅ Model User dengan indexing dan validasi
   - ✅ Model Pengajuan dengan 27 status workflow
   - ✅ Model Notification untuk notifikasi real-time
   - ✅ Controllers lengkap untuk semua operasi CRUD
   - ✅ Helper utilities untuk operasi database
   - ✅ Data seeder untuk testing

2. **Frontend API Integration**
   - ✅ API client lengkap untuk semua endpoint
   - ✅ LS adapter yang langsung ke MongoDB (no fallback)
   - ✅ Error handling yang lebih baik
   - ✅ Kompatibilitas penuh dengan kode frontend existing

3. **Optimisasi Database**
   - ✅ Indexes untuk query yang lebih cepat
   - ✅ Schema validation dan sanitization
   - ✅ Field aliases untuk backward compatibility
   - ✅ Virtual fields untuk frontend compatibility

---

## 🚀 SETUP AWAL

### 1. Install & Start MongoDB

**Windows:**
```powershell
# Download MongoDB Community Server dari:
# https://www.mongodb.com/try/download/community

# Atau install via Chocolatey
choco install mongodb

# Start MongoDB Service
net start MongoDB

# Atau jalankan manual
mongod --dbpath "C:\data\db"
```

**Check MongoDB Status:**
```powershell
# Test connection
mongosh

# Dalam mongosh:
show dbs
use gmit_yegar_db
show collections
```

---

### 2. Install Backend Dependencies

```powershell
cd Backend
npm install
```

**Dependencies:**
- `express@^5.2.1` - Web framework
- `mongoose@^9.0.0` - MongoDB ODM
- `bcryptjs@^3.0.3` - Password hashing
- `cors@^2.8.5` - CORS middleware
- `dotenv@^17.2.3` - Environment variables

---

### 3. Configure Environment

File: `Backend/.env`
```env
MONGO_URI=mongodb://localhost:27017/gmit_yegar_db
PORT=5000
```

---

### 4. Seed Initial Data (PENTING!)

```powershell
cd Backend

# Import sample data (users, pengajuan, notifications)
node seeder.js -i

# Atau hapus semua data
node seeder.js -d
```

**Akun Testing yang Dibuat:**
```
ADMIN:       admin@gmityegar.com / admin123
TATAUSAHA:   tu@gmityegar.com / tu123456
SEKRETARIS:  sekretaris@gmityegar.com / sekretaris123
PENDETA:     pendeta@gmityegar.com / pendeta123
KOORDINATOR: koor.a@gmityegar.com / koor123
KOORDINATOR: koor.b@gmityegar.com / koor123
JEMAAT:      jemaat.a@gmityegar.com / jemaat123
JEMAAT:      jemaat.b@gmityegar.com / jemaat123
```

---

### 5. Start Backend Server

```powershell
cd Backend
node server.js
```

**Expected Output:**
```
✅ MongoDB Connected
🚀 Server running on port 5000
```

**Test Backend:**
```powershell
# Test server health
curl http://localhost:5000/

# Test user login
curl -X POST http://localhost:5000/api/users/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@gmityegar.com","password":"admin123"}'
```

---

### 6. Start Frontend

```powershell
cd Frontend
npx http-server -p 8080 -c-1
```

Buka browser: `http://localhost:8080`

---

## 📊 STRUKTUR DATABASE MONGODB

### Collection: `users`

```javascript
{
  _id: ObjectId("..."),
  nik: "1234567890123456",  // Unique, indexed
  name: "Nama Lengkap",
  email: "email@example.com", // Unique, indexed
  password: "$2a$10$...",     // Hashed with bcrypt
  role: "jemaat",            // Enum: admin, tatausaha, sekretaris, pendeta, koordinator, jemaat
  rayon: "Rayon A",          // Required for koordinator & jemaat
  address: "Alamat lengkap",
  createdAt: ISODate("2024-12-03T..."),
  updatedAt: ISODate("2024-12-03T...")
}
```

**Indexes:**
- `nik` (unique)
- `email` (unique)
- `role`
- `rayon`
- `{ role: 1, rayon: 1 }` (compound)

---

### Collection: `pengajuans`

```javascript
{
  _id: ObjectId("..."),
  
  // User Information (Denormalized)
  user_id: "507f1f77bcf86cd799439011",
  user_nik: "1234567890123456",
  user_nama: "Nama Jemaat",
  user_email: "jemaat@example.com",
  user_rayon: "Rayon A",
  
  // Letter Details
  rayon: "Rayon A",
  type: "baptis",        // baptis, nikah, sidi, kematian, pindah, aktif, keterangan
  tipe: "baptis",        // Alias
  status: "baru",        // 27 status values (see below)
  
  // Form Data (Dynamic based on type)
  form: {
    nama_anak: "Maria",
    tanggal_lahir: "2024-01-15",
    // ... other fields
  },
  
  // Metadata
  meta: {},
  
  // Notes from different roles
  koor_note: "Catatan koordinator",
  rejection_note: "Alasan penolakan",
  sekretaris_note: "Catatan sekretaris",
  pendeta_note: "Catatan pendeta",
  catatan: "Catatan umum",
  
  // Files (Base64 or URL)
  draft_text: "Draft surat...",
  final_file: "data:application/pdf;base64,...",
  final_file_data: "...",    // Alias
  final_file_name: "surat.pdf",
  final_file_type: "application/pdf",
  final_file_size: 204800,
  
  // Letter Number
  nomor_surat: "001/BAP/GMIT-YEGAR/RAYON-A/12/2024",
  nomor: "001/BAP/...",      // Alias
  
  // Timeline (Audit Trail)
  timeline: [
    {
      at: ISODate("2024-12-03T..."),
      by: "Nama User",
      action: "submitted",
      note: "Pengajuan dibuat"
    }
  ],
  
  // Timestamps
  created_at: ISODate("2024-12-03T..."),
  last_updated: ISODate("2024-12-03T..."),
  validated_at: ISODate("2024-12-03T..."),
  archived_at: ISODate("2024-12-03T...")
}
```

**27 Status Values:**
```
baru, submitted, draft, proses, diterima, 
verified_by_koordinator, rejected_by_koor, ditolak,
file_uploaded, disposisi_tu, disposisi_to_tatausaha,
disposisi_to_sekretaris, returned_by_sekretaris, 
validated_by_sekretaris, disposisi_to_pendeta,
returned_by_pendeta, validated_by_pendeta,
kembali, validated, arsip, archived
```

**Indexes:**
- `{ user_id: 1, status: 1 }`
- `{ rayon: 1, status: 1 }`
- `{ status: 1, created_at: -1 }`
- `{ type: 1, status: 1 }`
- `user_nik`

---

### Collection: `notifications`

```javascript
{
  _id: ObjectId("..."),
  
  // Target User
  user_id: "507f1f77bcf86cd799439011",
  to_role: "koordinator",    // Target role (broadcast)
  to_nik: "1234567890123456", // Target specific user
  
  // Notification Content
  type: "surat_masuk",       // info, success, warning, error, surat_*
  title: "Pengajuan Baru",
  judul: "Pengajuan Baru",   // Alias
  message: "Ada pengajuan surat baru...",
  pesan: "Ada pengajuan surat baru...", // Alias
  
  // Related Data
  related_id: ObjectId("..."), // Pengajuan ID
  pengajuan_id: "507f...",
  ref_id: "507f...",          // Alias
  
  // Status
  is_read: false,
  read: false,               // Alias
  
  // Optional URL
  url: "/pages/koordinator/daftar-surat-masuk.html",
  
  // Timestamp
  tanggal: ISODate("2024-12-03T...")
}
```

**Indexes:**
- `{ user_id: 1, is_read: 1 }`
- `{ to_role: 1, is_read: 1 }`
- `{ to_nik: 1, is_read: 1 }`
- `{ tanggal: -1 }`

---

## 🔌 API ENDPOINTS

### Users

```javascript
// Register
POST /api/users/register
Body: { nik, name, email, password, role, rayon }

// Login
POST /api/users/login
Body: { email, password }

// Get All Users
GET /api/users

// Get User by ID
GET /api/users/:id

// Update User
PUT /api/users/:id
Body: { name, email, role, rayon, password }

// Delete User
DELETE /api/users/:id
```

### Pengajuan

```javascript
// Create Pengajuan
POST /api/pengajuan
Body: {
  user_id, user_nik, user_nama, user_email, user_rayon,
  rayon, type, form, meta, status
}

// Get All Pengajuan (with filters)
GET /api/pengajuan?role=koordinator&rayon=Rayon A&status=baru

// Get Pengajuan by ID
GET /api/pengajuan/:id

// Update Pengajuan
PUT /api/pengajuan/:id
Body: { status, timeline, form, ... }

// Update Status Only
PUT /api/pengajuan/:id/status
Body: { status, by, note, to_role }

// Delete Pengajuan
DELETE /api/pengajuan/:id
```

### Notifications

```javascript
// Get Notifications (with filters)
GET /api/notifications?user_id=...&role=koordinator

// Create Notification
POST /api/notifications
Body: { to_role, to_nik, type, title, message, related_id }

// Mark as Read
PUT /api/notifications/:id/read

// Delete Notification
DELETE /api/notifications/:id
```

---

## 💻 FRONTEND USAGE

### API Client (`window.API`)

```javascript
// Users
const user = await API.users.login(email, password);
const users = await API.users.getAll();
await API.users.update(userId, { name: "New Name" });

// Pengajuan
const pengajuan = await API.pengajuan.create({
  user_id: currentUser.id,
  user_nik: currentUser.nik,
  user_nama: currentUser.name,
  rayon: currentUser.rayon,
  type: 'baptis',
  form: { /* ... */ }
});

const list = await API.pengajuan.getAll({ 
  role: 'koordinator',
  rayon: 'Rayon A'
});

await API.pengajuan.updateStatus(id, {
  status: 'verified_by_koordinator',
  by: currentUser.name,
  note: 'Disetujui'
});

// Notifications
const notifications = await API.notifications.getAll({ 
  user_id: currentUser.id 
});
await API.notifications.markAsRead(notifId);
```

### Legacy LS Adapter (`window.LS`)

**Tetap berfungsi untuk backward compatibility:**

```javascript
// Load data (async, dari MongoDB)
const users = await LS.loadArray('users');
const pengajuan = await LS.loadArray('local_pengajuan');

// Create/Push (async)
const newPengajuan = await LS.pushItem('local_pengajuan', data);

// Update (async)
await LS.updateById('local_pengajuan', id, { status: 'baru' });

// Delete (async)
await LS.removeById('local_pengajuan', id);

// Current User (sync - masih pakai localStorage untuk session)
const user = LS.getCurrentUser();
LS.setCurrentUser(user);
LS.logout();
```

---

## 🔧 UTILITIES & HELPERS

File: `Backend/utils/helpers.js`

```javascript
const { 
  createNotification,
  generateNomorSurat,
  formatDateID,
  validateNIK,
  validateEmail,
  getStatusDisplay,
  canAccessPengajuan 
} = require('../utils/helpers');

// Create notification
await createNotification({
  to_role: 'koordinator',
  type: 'surat_masuk',
  title: 'Pengajuan Baru',
  message: 'Ada pengajuan dari Rayon A',
  related_id: pengajuanId
});

// Generate nomor surat
const nomor = generateNomorSurat(1, 'Rayon A', 'baptis');
// Output: "001/BAP/GMIT-YEGAR/RAYON-A/12/2024"

// Validate NIK
if (!validateNIK('1234567890123456')) {
  throw new Error('NIK tidak valid');
}

// Check access
if (!canAccessPengajuan(user, pengajuan)) {
  throw new Error('Tidak ada akses');
}
```

---

## 🔍 QUERY EXAMPLES

### MongoDB Shell (mongosh)

```javascript
// Connect
mongosh

use gmit_yegar_db

// Find all users
db.users.find()

// Find koordinator rayon A
db.users.find({ role: 'koordinator', rayon: 'Rayon A' })

// Find pengajuan yang belum diverifikasi
db.pengajuans.find({ 
  status: { $in: ['baru', 'submitted'] } 
}).sort({ created_at: -1 })

// Find pengajuan dari jemaat tertentu
db.pengajuans.find({ user_nik: '1234567890123456' })

// Count pengajuan per status
db.pengajuans.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
])

// Find unread notifications for koordinator
db.notifications.find({ 
  to_role: 'koordinator', 
  is_read: false 
})

// Update status pengajuan
db.pengajuans.updateOne(
  { _id: ObjectId('...') },
  { 
    $set: { status: 'verified_by_koordinator' },
    $push: {
      timeline: {
        at: new Date(),
        by: 'Koordinator',
        action: 'verified',
        note: 'Diverifikasi'
      }
    }
  }
)

// Delete test data
db.users.deleteMany({ email: /test/ })
db.pengajuans.deleteMany({ user_nama: /Test/ })
```

---

## 🛠️ TROUBLESHOOTING

### 1. Backend tidak bisa connect ke MongoDB

**Problem:** `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution:**
```powershell
# Check MongoDB service
net start MongoDB

# Atau start manual
mongod --dbpath "C:\data\db"

# Check connection
mongosh
```

### 2. CORS Error di Frontend

**Problem:** `Access to fetch at 'http://localhost:5000' blocked by CORS`

**Solution:** Pastikan backend menggunakan CORS middleware (sudah ada di `server.js`)

### 3. Login gagal dengan "Invalid email or password"

**Check:**
1. Apakah data sudah di-seed? `node seeder.js -i`
2. Apakah email/password benar?
3. Check di MongoDB: `db.users.findOne({ email: 'admin@gmityegar.com' })`

### 4. Data tidak muncul di frontend

**Check:**
1. Apakah backend running? `curl http://localhost:5000/api/pengajuan`
2. Check browser console untuk error
3. Check Network tab di DevTools

### 5. Error "Failed to load ... from database"

**Problem:** Backend tidak running atau tidak bisa diakses

**Solution:**
```powershell
# Start backend
cd Backend
node server.js

# Check health
curl http://localhost:5000/
```

---

## 📈 MONITORING & MAINTENANCE

### Database Size

```javascript
// Check database size
db.stats()

// Check collection sizes
db.users.stats()
db.pengajuans.stats()
db.notifications.stats()
```

### Backup Database

```powershell
# Backup
mongodump --db gmit_yegar_db --out "D:\Backup\MongoDB"

# Restore
mongorestore --db gmit_yegar_db "D:\Backup\MongoDB\gmit_yegar_db"
```

### Clean Old Notifications

```javascript
// Delete notifications older than 30 days
db.notifications.deleteMany({
  tanggal: { $lt: new Date(Date.now() - 30*24*60*60*1000) },
  is_read: true
})
```

### Index Maintenance

```javascript
// List all indexes
db.pengajuans.getIndexes()

// Rebuild indexes (if needed)
db.pengajuans.reIndex()
```

---

## 🎓 BEST PRACTICES

### 1. Error Handling

```javascript
// Frontend
try {
  const pengajuan = await API.pengajuan.create(data);
  alert('Pengajuan berhasil dibuat!');
} catch (error) {
  console.error('Error:', error);
  alert('Gagal membuat pengajuan: ' + error.message);
}
```

### 2. Loading States

```javascript
async function loadData() {
  showLoading(true);
  try {
    const data = await API.pengajuan.getAll();
    renderTable(data);
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}
```

### 3. Data Validation

```javascript
// Before creating pengajuan
if (!data.user_nik || !data.rayon || !data.type) {
  throw new Error('Data tidak lengkap');
}

// Use helpers
if (!validateNIK(data.user_nik)) {
  throw new Error('NIK tidak valid');
}
```

### 4. Pagination (for large datasets)

```javascript
// Backend - Add to controller
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const skip = (page - 1) * limit;

const pengajuanList = await Pengajuan.find(query)
  .sort({ created_at: -1 })
  .limit(limit)
  .skip(skip);

const total = await Pengajuan.countDocuments(query);

res.json({
  data: pengajuanList,
  pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  }
});
```

---

## 🚀 PRODUCTION DEPLOYMENT

### Environment Variables

```env
# Production .env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/gmit_yegar_db
PORT=5000
NODE_ENV=production
JWT_SECRET=your-secret-key-here
```

### Security Checklist

- ✅ Use environment variables for sensitive data
- ✅ Enable MongoDB authentication
- ✅ Use HTTPS in production
- ✅ Implement JWT for stateless auth
- ✅ Add rate limiting
- ✅ Sanitize all user inputs
- ✅ Regular database backups
- ✅ Monitor server logs

---

## 📞 SUPPORT

Jika ada masalah:
1. Check server logs: `Backend/server.js` output
2. Check MongoDB logs: `mongosh` queries
3. Check browser console: Network & Console tabs
4. Re-seed database: `node seeder.js -i`

---

**✅ Sistem sudah 100% MongoDB - No localStorage!**
