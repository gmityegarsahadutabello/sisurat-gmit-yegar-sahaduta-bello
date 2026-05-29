# 📊 MONGODB SCHEMA - SESUAI ALUR KERJA SISTEM

Dokumentasi lengkap skema dan model MongoDB yang disesuaikan dengan `ALUR_KERJA_SISTEM.md`.

---

## 🗂️ Collections Overview

```
gmit_yegar_db/
├── users           # Akun pengguna (jemaat & staff)
├── pengajuans      # Pengajuan surat (dengan tracking lengkap)
└── notifications   # Notifikasi untuk jemaat
```

---

## 👤 Collection: `users`

### Schema Definition

```javascript
{
  _id: ObjectId,
  nik: String (required, unique, indexed),      // NIK 16 digit
  name: String (required),                       // Nama lengkap
  email: String (required, unique, indexed),     // Email (unique)
  password: String (required, hashed),           // Password (bcrypt)
  role: String (enum, indexed),                  // Role pengguna
  rayon: String (nullable, indexed),             // Rayon (untuk jemaat & koordinator)
  address: String (nullable),                    // Alamat
  createdAt: Date,                               // Auto timestamp
  updatedAt: Date                                // Auto timestamp
}
```

### Role Types

| Role | Keterangan | Rayon Required |
|------|------------|----------------|
| `jemaat` | Jemaat gereja | ✅ Ya |
| `koordinator` | Koordinator rayon | ✅ Ya |
| `tatausaha` | Tata Usaha | ❌ Tidak |
| `sekretaris` | Sekretaris | ❌ Tidak |
| `pendeta` | Pendeta | ❌ Tidak |
| `admin` | Administrator | ❌ Tidak |

### Indexes

```javascript
userSchema.index({ nik: 1 });                  // NIK unique index
userSchema.index({ email: 1 });                // Email unique index
userSchema.index({ role: 1 });                 // Role query
userSchema.index({ role: 1, rayon: 1 });       // Compound: role + rayon
```

### Validation Rules

1. **NIK**: Hanya angka, minimum 6 digit
2. **Email**: Format email valid, unique
3. **Password**: 
   - Minimum 6 karakter
   - Di-hash dengan bcryptjs sebelum disimpan
   - Tidak pernah di-return dalam response API
4. **Rayon**: Wajib untuk role `jemaat` dan `koordinator`

### Methods

```javascript
// Match password untuk login
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
```

### Sample Data

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  nik: "1234567890123456",
  name: "John Doe",
  email: "john.jemaat@gmityegar.com",
  password: "$2a$10$...",  // hashed
  role: "jemaat",
  rayon: "Rayon A",
  address: "Jl. Contoh No. 123",
  createdAt: ISODate("2025-11-01T10:00:00Z"),
  updatedAt: ISODate("2025-11-01T10:00:00Z")
}
```

---

## 📄 Collection: `pengajuans`

### Schema Definition

```javascript
{
  _id: ObjectId,
  
  // === USER INFORMATION (Denormalized) ===
  user: ObjectId (ref: 'User'),                  // Reference ke users collection
  user_id: String (required),                    // String ID dari frontend
  user_nik: String (required, indexed),          // NIK pemohon
  user_nama: String (required),                  // Nama pemohon
  user_email: String,                            // Email pemohon
  user_rayon: String,                            // Rayon pemohon
  rayon: String (required, indexed),             // Rayon (untuk filter koordinator)
  
  // === JENIS SURAT ===
  type: String (required),                       // Jenis surat
  tipe: String,                                  // Alias untuk type
  
  // === STATUS ALUR KERJA ===
  status: String (enum, indexed, default: 'proses'),
  
  // === FORM DATA ===
  form: Mixed,                                   // Data form (flexible)
  meta: Mixed,                                   // Metadata tambahan
  
  // === NOTES & REASONS (WAJIB untuk aksi tertentu) ===
  koor_note: String,                             // Catatan Koordinator saat verifikasi
  rejection_note: String,                        // Alasan penolakan (WAJIB jika ditolak)
  return_reason: String,                         // Alasan pengembalian (WAJIB jika dikembalikan)
  sekretaris_note: String,                       // Catatan Sekretaris
  pendeta_note: String,                          // Catatan Pendeta saat validasi final
  catatan: String,                               // Catatan umum
  
  // === FILES ===
  draft_file: String,                            // Draft text atau base64
  draft_text: String,                            // Draft text surat
  final_file: String,                            // File surat final (base64)
  final_file_data: String,                       // Alias untuk final_file
  final_file_name: String,                       // Nama file
  file_name: String,                             // Alias
  final_file_type: String,                       // MIME type (application/pdf, etc)
  final_file_size: Number,                       // Ukuran file (bytes)
  
  // === NUMBERING ===
  nomor_surat: String,                           // Nomor surat resmi
  nomor: String,                                 // Alias
  nomor_seq: Number (default: 0),                // Sequential number
  
  // === TIMESTAMPS ===
  created_at: Date (default: now),               // Tanggal pengajuan dibuat
  last_updated: Date (default: now),             // Last update
  validated_at: Date,                            // Tanggal validasi final (Pendeta)
  archived_at: Date,                             // Tanggal diarsipkan
  verifiedAt: Date,                              // Tanggal verifikasi koordinator
  tanggal: Date,                                 // Alias creation date
  
  // === TIMELINE (Audit Trail) ===
  timeline: [TimelineSchema],                    // Array tracking lengkap
  history: [TimelineSchema]                      // Alias untuk timeline
}
```

### Status Enum (Alur Kerja Sistem)

| Status | Fase | Keterangan | Akses |
|--------|------|------------|-------|
| **`proses`** | FASE 1 | Baru diajukan jemaat | Koordinator |
| **`diterima`** | FASE 2 | Diverifikasi koordinator ✅ | Tata Usaha |
| **`ditolak`** | FASE 2 | Ditolak koordinator ❌ | Jemaat (bisa ajukan ulang) |
| **`disposisi_to_sekretaris`** | FASE 3 | TU upload file & kirim | Sekretaris |
| **`disposisi_to_pendeta`** | FASE 4 | Sekretaris validasi & kirim | Pendeta |
| **`disposisi_to_tatausaha`** | FASE 4/5 | Dikembalikan ke TU (revisi) | Tata Usaha |
| **`validated_by_pendeta`** | FASE 5 | Validasi final Pendeta ✅ | Jemaat (download) |

**Legacy Status** (backward compatibility):
- `baru`, `submitted`, `draft`
- `verified_by_koordinator`, `rejected_by_koor`
- `file_uploaded`, `disposisi_tu`
- `returned_by_sekretaris`, `validated_by_sekretaris`
- `returned_by_pendeta`
- `kembali`, `validated`, `arsip`, `archived`

### Timeline Schema

```javascript
{
  at: Date (default: now),                       // Timestamp aksi
  by: String (required),                         // Nama user atau role
  action: String (required),                     // Aksi yang dilakukan
  note: String (default: '')                     // Catatan/alasan
}
```

### Timeline Examples

#### Contoh 1: Surat Berhasil (Happy Path)

```javascript
timeline: [
  {
    at: ISODate("2025-11-27T10:00:00Z"),
    by: "John Doe",
    action: "proses",
    note: "Surat dibuat oleh jemaat"
  },
  {
    at: ISODate("2025-11-27T14:30:00Z"),
    by: "Koordinator Rayon A",
    action: "diterima",
    note: "Diverifikasi oleh Koordinator Rayon"
  },
  {
    at: ISODate("2025-11-28T09:15:00Z"),
    by: "Tata Usaha",
    action: "file_uploaded",
    note: "File surat_baptis.pdf berhasil diunggah"
  },
  {
    at: ISODate("2025-11-28T09:20:00Z"),
    by: "Tata Usaha",
    action: "disposisi_to_sekretaris",
    note: "Diteruskan ke Sekretaris oleh Tata Usaha"
  },
  {
    at: ISODate("2025-11-28T15:20:00Z"),
    by: "Sekretaris GMIT",
    action: "disposisi_to_pendeta",
    note: "Diteruskan ke Pendeta oleh Sekretaris"
  },
  {
    at: ISODate("2025-11-29T08:30:00Z"),
    by: "Pendeta GMIT",
    action: "validated_by_pendeta",
    note: "Divalidasi final oleh Pendeta - Surat selesai"
  }
]
```

#### Contoh 2: Surat Ditolak Koordinator

```javascript
timeline: [
  {
    at: ISODate("2025-11-27T10:00:00Z"),
    by: "Jane Smith",
    action: "proses",
    note: "Surat dibuat oleh jemaat"
  },
  {
    at: ISODate("2025-11-27T14:00:00Z"),
    by: "Koordinator Rayon B",
    action: "ditolak",
    note: "Data tidak lengkap - mohon melengkapi alamat lengkap"
  }
]
```

#### Contoh 3: Surat Dikembalikan Sekretaris

```javascript
timeline: [
  {
    at: ISODate("2025-11-27T10:00:00Z"),
    by: "Bob Wilson",
    action: "proses",
    note: "Surat dibuat oleh jemaat"
  },
  {
    at: ISODate("2025-11-27T14:30:00Z"),
    by: "Koordinator Rayon C",
    action: "diterima",
    note: "Diverifikasi oleh Koordinator Rayon"
  },
  {
    at: ISODate("2025-11-28T09:15:00Z"),
    by: "Tata Usaha",
    action: "file_uploaded",
    note: "File surat_nikah.pdf berhasil diunggah"
  },
  {
    at: ISODate("2025-11-28T09:20:00Z"),
    by: "Tata Usaha",
    action: "disposisi_to_sekretaris",
    note: "Diteruskan ke Sekretaris oleh Tata Usaha"
  },
  {
    at: ISODate("2025-11-28T11:00:00Z"),
    by: "Sekretaris GMIT",
    action: "disposisi_to_tatausaha",
    note: "Format tanggal salah - mohon perbaiki tanggal pernikahan"
  },
  {
    at: ISODate("2025-11-28T13:45:00Z"),
    by: "Tata Usaha",
    action: "file_uploaded",
    note: "File surat_nikah_revisi.pdf berhasil diunggah"
  },
  {
    at: ISODate("2025-11-28T13:50:00Z"),
    by: "Tata Usaha",
    action: "disposisi_to_sekretaris",
    note: "Diteruskan ke Sekretaris oleh Tata Usaha (revisi)"
  },
  {
    at: ISODate("2025-11-28T15:20:00Z"),
    by: "Sekretaris GMIT",
    action: "disposisi_to_pendeta",
    note: "Diteruskan ke Pendeta oleh Sekretaris"
  },
  {
    at: ISODate("2025-11-29T08:30:00Z"),
    by: "Pendeta GMIT",
    action: "validated_by_pendeta",
    note: "Divalidasi final oleh Pendeta - Surat selesai"
  }
]
```

### Indexes

```javascript
pengajuanSchema.index({ user_id: 1, status: 1 });     // Filter jemaat
pengajuanSchema.index({ rayon: 1, status: 1 });       // Filter koordinator
pengajuanSchema.index({ status: 1, created_at: -1 }); // Sort status + date
pengajuanSchema.index({ type: 1, status: 1 });        // Filter by type
pengajuanSchema.index({ user_nik: 1 });               // Search by NIK
```

### Validation Rules (Backend)

1. **Koordinator:**
   - Hanya bisa akses pengajuan dengan `rayon` sama dengan rayon koordinator
   - Jika tolak: `rejection_note` **WAJIB** diisi
   
2. **Tata Usaha:**
   - Wajib upload `final_file` sebelum disposisi ke Sekretaris
   - File type: PDF, Word, JPG
   - Max size: 2MB
   
3. **Sekretaris & Pendeta:**
   - Jika kembalikan ke TU: `return_reason` **WAJIB** diisi
   - Tidak bisa return tanpa alasan

### Sample Data

```javascript
{
  _id: ObjectId("507f191e810c19729de860ea"),
  user: ObjectId("507f1f77bcf86cd799439011"),
  user_id: "507f1f77bcf86cd799439011",
  user_nik: "1234567890123456",
  user_nama: "John Doe",
  user_email: "john.jemaat@gmityegar.com",
  user_rayon: "Rayon A",
  rayon: "Rayon A",
  
  type: "surat-baptis",
  tipe: "surat-baptis",
  status: "validated_by_pendeta",
  
  form: {
    nama_anak: "Baby John",
    tanggal_lahir: "2025-01-15",
    nama_ayah: "John Doe",
    nama_ibu: "Jane Doe",
    tanggal_baptis: "2025-03-20"
  },
  
  meta: {},
  
  koor_note: "Data lengkap dan valid",
  rejection_note: null,
  return_reason: null,
  sekretaris_note: "Format sudah sesuai",
  pendeta_note: "Disetujui",
  
  final_file: "data:application/pdf;base64,JVBERi0xLjQKJeLjz9...",
  final_file_name: "surat_baptis_baby_john.pdf",
  final_file_type: "application/pdf",
  final_file_size: 245678,
  
  nomor_surat: "001/BAP/GMIT-YEGAR/RAYON-A/03/2025",
  nomor_seq: 1,
  
  created_at: ISODate("2025-11-27T10:00:00Z"),
  last_updated: ISODate("2025-11-29T08:30:00Z"),
  validated_at: ISODate("2025-11-29T08:30:00Z"),
  
  timeline: [
    {
      at: ISODate("2025-11-27T10:00:00Z"),
      by: "John Doe",
      action: "proses",
      note: "Surat dibuat oleh jemaat"
    },
    {
      at: ISODate("2025-11-27T14:30:00Z"),
      by: "Koordinator Rayon A",
      action: "diterima",
      note: "Diverifikasi oleh Koordinator Rayon"
    },
    {
      at: ISODate("2025-11-28T09:15:00Z"),
      by: "Tata Usaha",
      action: "file_uploaded",
      note: "File surat_baptis_baby_john.pdf berhasil diunggah"
    },
    {
      at: ISODate("2025-11-28T09:20:00Z"),
      by: "Tata Usaha",
      action: "disposisi_to_sekretaris",
      note: "Diteruskan ke Sekretaris oleh Tata Usaha"
    },
    {
      at: ISODate("2025-11-28T15:20:00Z"),
      by: "Sekretaris GMIT",
      action: "disposisi_to_pendeta",
      note: "Diteruskan ke Pendeta oleh Sekretaris"
    },
    {
      at: ISODate("2025-11-29T08:30:00Z"),
      by: "Pendeta GMIT",
      action: "validated_by_pendeta",
      note: "Divalidasi final oleh Pendeta - Surat selesai"
    }
  ]
}
```

---

## 🔔 Collection: `notifications`

### Schema Definition

```javascript
{
  _id: ObjectId,
  
  // === TARGET NOTIFICATION ===
  user_id: String,                               // String ID user penerima
  user: ObjectId (ref: 'User'),                  // Reference ke users collection
  to_role: String,                               // Target role (nullable)
  to_nik: String,                                // Target NIK (nullable)
  
  // === NOTIFICATION TYPE ===
  type: String (enum, default: 'info'),
  
  // === CONTENT ===
  title: String (required),                      // Judul notifikasi
  judul: String,                                 // Alias untuk title
  message: String (required),                    // Pesan notifikasi
  pesan: String,                                 // Alias untuk message
  
  // === RELATED DATA ===
  related_id: ObjectId (ref: 'Pengajuan'),       // Reference ke pengajuan
  pengajuan_id: String,                          // String ID pengajuan
  ref_id: String,                                // Alias
  url: String (default: ''),                     // URL target
  
  // === STATUS ===
  is_read: Boolean (default: false),             // Status dibaca
  read: Boolean,                                 // Alias untuk is_read
  
  // === TIMESTAMP ===
  tanggal: Date,                                 // Timestamp notifikasi
  createdAt: Date,                               // Auto timestamp (alias: tanggal)
  updatedAt: Date                                // Auto timestamp
}
```

### Notification Types (Jemaat)

| Type | Icon | Warna | Trigger | Pesan Template |
|------|------|-------|---------|----------------|
| **`surat_dibuat`** | 📄 | Biru | Jemaat submit pengajuan | "Pengajuan [jenis surat] Anda telah berhasil dibuat dan akan diproses oleh Koordinator Rayon." |
| **`surat_ditolak`** | ❌ | Merah | Koordinator tolak pengajuan | "Pengajuan [jenis surat] Anda ditolak oleh Koordinator Rayon. Alasan: [catatan]" |
| **`surat_masuk`** | ✅ | Hijau | Pendeta validasi final | "Pengajuan [jenis surat] Anda telah selesai diproses dan siap diambil." |

### Notification Types (Staff - Internal)

| Type | Target | Trigger |
|------|--------|---------|
| `surat_diterima` | Tata Usaha | Koordinator terima pengajuan |
| `surat_disposisi` | Sekretaris/Pendeta | TU disposisi surat |
| `surat_validated` | Tata Usaha | Sekretaris/Pendeta validasi |
| `surat_returned` | Tata Usaha | Sekretaris/Pendeta return surat |
| `surat_archived` | Admin | Surat diarsipkan |

### Indexes

```javascript
notificationSchema.index({ user_id: 1, is_read: 1 }); // Filter user + read status
notificationSchema.index({ to_role: 1, is_read: 1 }); // Filter role + read status
notificationSchema.index({ to_nik: 1, is_read: 1 });  // Filter NIK + read status
notificationSchema.index({ tanggal: -1 });            // Sort by date (newest first)
```

### Sample Data

#### Notifikasi: Surat Dibuat

```javascript
{
  _id: ObjectId("507f191e810c19729de860eb"),
  user_id: "507f1f77bcf86cd799439011",
  user: ObjectId("507f1f77bcf86cd799439011"),
  to_role: null,
  to_nik: "1234567890123456",
  
  type: "surat_dibuat",
  
  title: "Surat Dibuat",
  judul: "Surat Dibuat",
  message: "Pengajuan Surat Baptis Anda telah berhasil dibuat dan akan diproses oleh Koordinator Rayon.",
  pesan: "Pengajuan Surat Baptis Anda telah berhasil dibuat dan akan diproses oleh Koordinator Rayon.",
  
  related_id: ObjectId("507f191e810c19729de860ea"),
  pengajuan_id: "507f191e810c19729de860ea",
  url: "pengajuan-detail.html?id=507f191e810c19729de860ea",
  
  is_read: false,
  read: false,
  
  tanggal: ISODate("2025-11-27T10:00:00Z"),
  createdAt: ISODate("2025-11-27T10:00:00Z"),
  updatedAt: ISODate("2025-11-27T10:00:00Z")
}
```

#### Notifikasi: Surat Ditolak

```javascript
{
  _id: ObjectId("507f191e810c19729de860ec"),
  user_id: "507f1f77bcf86cd799439012",
  to_nik: "1234567890123457",
  
  type: "surat_ditolak",
  
  title: "Surat Ditolak",
  message: "Pengajuan Surat Nikah Anda ditolak oleh Koordinator Rayon. Alasan: Data tidak lengkap - mohon melengkapi alamat lengkap",
  
  related_id: ObjectId("507f191e810c19729de860ed"),
  pengajuan_id: "507f191e810c19729de860ed",
  url: "pengajuan-detail.html?id=507f191e810c19729de860ed",
  
  is_read: false,
  
  tanggal: ISODate("2025-11-27T14:00:00Z"),
  createdAt: ISODate("2025-11-27T14:00:00Z")
}
```

#### Notifikasi: Surat Masuk

```javascript
{
  _id: ObjectId("507f191e810c19729de860ed"),
  user_id: "507f1f77bcf86cd799439011",
  to_nik: "1234567890123456",
  
  type: "surat_masuk",
  
  title: "Surat Masuk",
  message: "Pengajuan Surat Baptis Anda telah selesai diproses dan siap diambil.",
  
  related_id: ObjectId("507f191e810c19729de860ea"),
  pengajuan_id: "507f191e810c19729de860ea",
  url: "surat-masuk.html",
  
  is_read: false,
  
  tanggal: ISODate("2025-11-29T08:30:00Z"),
  createdAt: ISODate("2025-11-29T08:30:00Z")
}
```

---

## 🔍 Query Examples

### 1. Get Pengajuan untuk Koordinator Rayon A

```javascript
db.pengajuans.find({
  rayon: "Rayon A",
  status: "proses"
}).sort({ created_at: -1 })
```

### 2. Get Pengajuan untuk Tata Usaha

```javascript
db.pengajuans.find({
  status: { $in: ["diterima", "disposisi_to_tatausaha"] }
}).sort({ created_at: -1 })
```

### 3. Get Pengajuan untuk Sekretaris

```javascript
db.pengajuans.find({
  status: "disposisi_to_sekretaris"
}).sort({ created_at: -1 })
```

### 4. Get Pengajuan untuk Pendeta

```javascript
db.pengajuans.find({
  status: "disposisi_to_pendeta"
}).sort({ created_at: -1 })
```

### 5. Get Surat Masuk untuk Jemaat

```javascript
db.pengajuans.find({
  user_nik: "1234567890123456",
  status: "validated_by_pendeta"
}).sort({ validated_at: -1 })
```

### 6. Get Notifikasi Jemaat (Unread)

```javascript
db.notifications.find({
  to_nik: "1234567890123456",
  is_read: false,
  type: { $in: ["surat_dibuat", "surat_ditolak", "surat_masuk"] }
}).sort({ tanggal: -1 }).limit(10)
```

### 7. Get All Pengajuan Jemaat

```javascript
db.pengajuans.find({
  user_nik: "1234567890123456"
}).sort({ created_at: -1 })
```

### 8. Count Surat by Status

```javascript
db.pengajuans.aggregate([
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } }
])
```

---

## 🔐 Access Control & Security

### Role-Based Access

| Role | Collection | Filter | Actions |
|------|------------|--------|---------|
| **Jemaat** | `pengajuans` | `user_nik` = own NIK | Read (own), Create |
| **Jemaat** | `notifications` | `to_nik` = own NIK | Read (own) |
| **Koordinator** | `pengajuans` | `rayon` = own rayon | Read (rayon), Update (verifikasi/tolak) |
| **Tata Usaha** | `pengajuans` | `status` IN ['diterima', 'disposisi_to_tatausaha'] | Read, Update (upload file, disposisi) |
| **Sekretaris** | `pengajuans` | `status` = 'disposisi_to_sekretaris' | Read, Update (validasi/kembalikan) |
| **Pendeta** | `pengajuans` | `status` = 'disposisi_to_pendeta' | Read, Update (validasi final/kembalikan) |
| **Admin** | `users` | All | Full CRUD |

### Mandatory Fields Validation

1. **Koordinator Tolak Pengajuan:**
   ```javascript
   if (action === 'ditolak' && !rejection_note) {
     throw new Error('Alasan penolakan wajib diisi');
   }
   ```

2. **Sekretaris/Pendeta Return Surat:**
   ```javascript
   if (action === 'disposisi_to_tatausaha' && !return_reason) {
     throw new Error('Alasan pengembalian wajib diisi');
   }
   ```

3. **Tata Usaha Disposisi:**
   ```javascript
   if (action === 'disposisi_to_sekretaris' && !final_file) {
     throw new Error('File surat wajib diupload sebelum disposisi');
   }
   ```

---

## 📈 Performance Optimization

### Compound Indexes

```javascript
// Koordinator: filter by rayon + status
pengajuanSchema.index({ rayon: 1, status: 1 });

// Jemaat: filter by NIK + status
pengajuanSchema.index({ user_nik: 1, status: 1 });

// Sort by status + date
pengajuanSchema.index({ status: 1, created_at: -1 });
```

### Query Optimization Tips

1. **Always use indexed fields** untuk filtering (rayon, status, user_nik)
2. **Limit results** saat query list (pagination)
3. **Select only needed fields** jika tidak perlu semua data
4. **Use aggregation** untuk complex queries & statistics

---

## 🧪 Testing Data

### Seed Script Command

```bash
cd Backend
node seeder.js -i  # Import sample data
node seeder.js -d  # Delete all data
```

### Sample Accounts Created

```
Admin:       admin@gmityegar.com / admin123
Tata Usaha:  tu@gmityegar.com / tu123456
Sekretaris:  sekretaris@gmityegar.com / sekretaris123
Pendeta:     pendeta@gmityegar.com / pendeta123
Koordinator: koor.a@gmityegar.com / koor123 (Rayon A)
Koordinator: koor.b@gmityegar.com / koor123 (Rayon B)
Jemaat:      jemaat.a@gmityegar.com / jemaat123 (Rayon A)
Jemaat:      jemaat.b@gmityegar.com / jemaat123 (Rayon B)
```

---

## 📚 Related Documentation

- `ALUR_KERJA_SISTEM.md` - Complete workflow specification
- `MONGODB_COMPLETE_GUIDE.md` - MongoDB setup & migration guide
- `WORKFLOW_DIAGRAM.md` - Visual workflow diagrams
- `README.md` - Quick start guide

---

**MongoDB Schema - GMIT YEGAR Sistem Surat**  
*Terstruktur, Terindeks, Teroptimasi*
