# 🔄 Panduan Migrasi dari localStorage ke MongoDB

## 📋 Ringkasan Perubahan

Sistem telah diperbarui untuk menggunakan **MongoDB** sebagai database backend, menggantikan localStorage. Skema dan model MongoDB telah disesuaikan 100% dengan struktur localStorage yang sudah ada.

---

## ✅ Yang Sudah Disesuaikan

### 1. **Model User** (`Backend/models/User.js`)
- ✅ Field: `nik`, `name`, `email`, `password`, `role`, `rayon`, `address`
- ✅ Password hashing otomatis dengan bcryptjs
- ✅ Method `matchPassword()` untuk verifikasi login
- ✅ Timestamps: `createdAt`, `updatedAt`

### 2. **Model Pengajuan** (`Backend/models/Pengajuan.js`)
**Denormalized User Data (sesuai localStorage):**
- ✅ `user_id`, `user_nik`, `user_nama`, `user_email`, `user_rayon`
- ✅ `rayon` (untuk filtering Koordinator)

**Field Utama:**
- ✅ `type`/`tipe` (surat-keterangan, surat-pindah, surat-baptis, surat-sidi)
- ✅ `form` (Mixed type untuk data surat yang fleksibel)
- ✅ `meta` (metadata tambahan)

**Status (semua status dari frontend):**
```javascript
[
  'baru', 'submitted', 'draft',
  'proses',
  'diterima', 'verified_by_koordinator',
  'rejected_by_koor', 'ditolak',
  'file_uploaded',
  'disposisi_tu', 'disposisi_to_tatausaha',
  'disposisi_to_sekretaris',
  'returned_by_sekretaris', 'validated_by_sekretaris',
  'disposisi_to_pendeta',
  'returned_by_pendeta', 'validated_by_pendeta',
  'kembali',
  'validated',
  'arsip', 'archived'
]
```

**Files:**
- ✅ `draft_file`, `draft_text`
- ✅ `final_file`, `final_file_name`, `final_file_type`, `final_file_size`

**Notes:**
- ✅ `koor_note`, `rejection_note`, `sekretaris_note`, `pendeta_note`, `catatan`

**Timeline:**
- ✅ Array of `{ at, by, action, note }`

**Timestamps:**
- ✅ `created_at`, `last_updated`, `validated_at`, `archived_at`

### 3. **Model Notification** (`Backend/models/Notification.js`)
- ✅ `user_id` (string ID dari frontend)
- ✅ `to_role`, `to_nik`
- ✅ `type` (termasuk semua tipe: surat_masuk, surat_diterima, dll)
- ✅ `title`/`judul`, `message`/`pesan` (alias untuk kompatibilitas)
- ✅ `related_id`, `pengajuan_id` (ObjectId dan string ID)
- ✅ `is_read`/`read`
- ✅ `tanggal` (timestamp)

### 4. **API Adapter** (`Frontend/assets/js/api.js`)
- ✅ LS.loadArray() → async, fallback ke localStorage jika API error
- ✅ LS.pushItem() → menggunakan API.create()
- ✅ LS.updateById() → menggunakan API.update()
- ✅ LS.removeById() → menggunakan API.delete()
- ✅ Error handling dengan fallback ke localStorage

---

## 🚀 Langkah Migrasi

### **Step 1: Pastikan MongoDB Running**

```bash
# Windows - jika MongoDB sebagai service
net start MongoDB

# Atau jalankan manual
mongod --dbpath "C:\data\db"
```

### **Step 2: Start Backend Server**

```bash
cd Backend
node server.js
```

Pastikan muncul:
```
Server running on port 5000
MongoDB Connected: localhost
```

### **Step 3: Export Data dari localStorage (Opsional)**

Buka browser console (F12) di halaman frontend, jalankan:

```javascript
// Export semua data localStorage
const exportData = {
  users: JSON.parse(localStorage.getItem('local_users') || '[]'),
  pengajuan: JSON.parse(localStorage.getItem('local_pengajuan') || '[]'),
  notifications: JSON.parse(localStorage.getItem('local_notifications') || '[]')
};

// Download sebagai file JSON
const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'localStorage_backup_' + new Date().toISOString().split('T')[0] + '.json';
a.click();

console.log('✅ Data exported!');
```

### **Step 4: Migrasi Data ke MongoDB**

Buat file migration script `Backend/migrate-localstorage.js`:

```javascript
const mongoose = require('mongoose');
const User = require('./models/User');
const Pengajuan = require('./models/Pengajuan');
const Notification = require('./models/Notification');
require('dotenv').config();

// Import data dari file JSON yang di-export
const data = require('./localStorage_backup_YYYY-MM-DD.json'); // Ganti dengan nama file

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📡 Connected to MongoDB');

    // Migrate Users
    console.log('👤 Migrating users...');
    for (const u of data.users) {
      const exists = await User.findOne({ $or: [{ email: u.email }, { nik: u.nik }] });
      if (!exists) {
        await User.create({
          nik: u.nik,
          name: u.nama || u.name,
          email: u.email,
          password: u.password, // Will be hashed by pre-save hook
          role: u.role,
          rayon: u.rayon
        });
        console.log(`  ✅ Created user: ${u.email}`);
      }
    }

    // Migrate Pengajuan
    console.log('📄 Migrating pengajuan...');
    for (const p of data.pengajuan) {
      const exists = await Pengajuan.findOne({ user_id: p.user_id, created_at: p.created_at || p.createdAt });
      if (!exists) {
        await Pengajuan.create({
          user_id: p.user_id,
          user_nik: p.user_nik || p.pemohon_nik,
          user_nama: p.user_nama || p.pemohon_nama,
          user_email: p.user_email || p.email,
          user_rayon: p.user_rayon || p.rayon,
          rayon: p.rayon || p.user_rayon,
          type: p.type || p.tipe,
          status: p.status || 'baru',
          form: p.form || p.formData || {},
          meta: p.meta || {},
          timeline: p.timeline || [],
          final_file: p.final_file,
          final_file_name: p.final_file_name,
          nomor_surat: p.nomor_surat,
          validated_at: p.validated_at,
          created_at: p.created_at || p.createdAt
        });
        console.log(`  ✅ Created pengajuan: ${p.id}`);
      }
    }

    // Migrate Notifications
    console.log('🔔 Migrating notifications...');
    for (const n of data.notifications) {
      const exists = await Notification.findOne({ user_id: n.user_id, tanggal: n.tanggal || n.createdAt });
      if (!exists) {
        await Notification.create({
          user_id: n.user_id,
          type: n.type,
          title: n.title || n.judul,
          message: n.message || n.pesan,
          is_read: n.is_read || n.read || false,
          tanggal: n.tanggal || n.createdAt
        });
        console.log(`  ✅ Created notification: ${n.id}`);
      }
    }

    console.log('✅ Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
```

Jalankan migration:

```bash
cd Backend
node migrate-localstorage.js
```

### **Step 5: Test Aplikasi**

1. Buka `register.html` → Coba registrasi akun baru
2. Login dengan akun yang baru dibuat
3. Buat pengajuan surat baru
4. Verifikasi data tersimpan di MongoDB (gunakan MongoDB Compass atau mongosh)

```bash
mongosh
use gmit_yegar_db
db.users.find().pretty()
db.pengajuans.find().pretty()
db.notifications.find().pretty()
```

---

## 🔍 Troubleshooting

### **Problem: "Failed to fetch" saat registrasi**

**Solusi:**
1. Pastikan backend server running (`node server.js`)
2. Pastikan MongoDB running
3. Cek browser console untuk error detail
4. Cek Network tab (F12) → pastikan request ke `http://localhost:5000/api/users/register`

### **Problem: Password tidak bisa login setelah migrasi**

**Solusi:**
Password dari localStorage adalah plaintext, tapi di MongoDB sudah di-hash. Anda perlu:
- Reset password via admin, atau
- Update password manual di MongoDB, atau
- Re-create akun dengan password baru

### **Problem: Data tidak muncul di frontend**

**Solusi:**
1. Buka browser console, lihat apakah ada error fetch
2. Pastikan API endpoint benar (`http://localhost:5000/api/...`)
3. Cek CORS settings di `server.js` (sudah enabled by default)

---

## 📊 Mapping Field localStorage → MongoDB

### **User**
| localStorage | MongoDB |
|--------------|---------|
| `id` | `_id` (auto) |
| `nik` | `nik` |
| `nama` / `name` | `name` |
| `email` | `email` |
| `password` | `password` (hashed) |
| `role` | `role` |
| `rayon` | `rayon` |

### **Pengajuan**
| localStorage | MongoDB |
|--------------|---------|
| `id` | `_id` (auto), `user_id` (string) |
| `user_id` | `user_id` |
| `user_nik` | `user_nik` |
| `user_nama` | `user_nama` |
| `user_email` | `user_email` |
| `user_rayon` | `user_rayon`, `rayon` |
| `type` / `tipe` | `type`, `tipe` |
| `status` | `status` |
| `form` | `form` |
| `timeline` | `timeline` |
| `final_file` | `final_file` |
| `nomor_surat` | `nomor_surat` |
| `created_at` | `created_at` |
| `last_updated` | `last_updated` |

### **Notification**
| localStorage | MongoDB |
|--------------|---------|
| `id` | `_id` (auto) |
| `user_id` | `user_id` |
| `type` | `type` |
| `judul` / `title` | `title`, `judul` |
| `pesan` / `message` | `message`, `pesan` |
| `read` / `is_read` | `is_read`, `read` |
| `tanggal` | `tanggal` |

---

## ✅ Checklist Post-Migration

- [ ] Backend server berjalan tanpa error
- [ ] MongoDB terkoneksi
- [ ] Registrasi user baru berhasil
- [ ] Login berhasil dengan akun baru
- [ ] Buat pengajuan surat berhasil
- [ ] Data muncul di dashboard
- [ ] Filter by rayon (Koordinator) bekerja
- [ ] Status update (verifikasi, disposisi) bekerja
- [ ] Notifikasi muncul
- [ ] Timeline tercatat dengan benar

---

## 🎯 Next Steps (Optional)

1. **Implementasi JWT Authentication** untuk session yang lebih aman
2. **Add Pagination** untuk daftar pengajuan/user yang banyak
3. **Add Search & Advanced Filtering** di backend
4. **Add File Upload to Cloud** (Cloudinary/AWS S3) untuk file surat
5. **Add Backup & Restore** otomatis untuk database

---

## 📞 Support

Jika ada masalah selama migrasi, simpan:
1. Error log dari backend terminal
2. Error dari browser console (F12)
3. Screenshot masalah

Sistem sekarang siap menggunakan MongoDB! 🚀
