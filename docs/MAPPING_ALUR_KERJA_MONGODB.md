# 🔄 MAPPING ALUR KERJA → MONGODB SCHEMA

Pemetaan lengkap antara alur kerja sistem dengan implementasi MongoDB.

---

## 📊 Status Mapping

### ALUR KERJA SISTEM → MongoDB Status

| Fase | Aksi | Status MongoDB | Collection Field |
|------|------|----------------|------------------|
| **FASE 1** | Jemaat submit pengajuan | `proses` | `pengajuans.status` |
| **FASE 2a** | Koordinator terima | `diterima` | `pengajuans.status` |
| **FASE 2b** | Koordinator tolak | `ditolak` | `pengajuans.status` + `rejection_note` |
| **FASE 3** | TU upload file | `diterima` | `pengajuans.final_file`, `final_file_name` |
| **FASE 3** | TU disposisi ke Sekretaris | `disposisi_to_sekretaris` | `pengajuans.status` |
| **FASE 4a** | Sekretaris return ke TU | `disposisi_to_tatausaha` | `pengajuans.status` + `return_reason` |
| **FASE 4b** | Sekretaris forward ke Pendeta | `disposisi_to_pendeta` | `pengajuans.status` |
| **FASE 5a** | Pendeta return ke TU | `disposisi_to_tatausaha` | `pengajuans.status` + `return_reason` |
| **FASE 5b** | Pendeta validasi final | `validated_by_pendeta` | `pengajuans.status` + `validated_at` |

---

## 🔔 Notifikasi Mapping

### Trigger Event → MongoDB Notification

| Event | Trigger | Notification Type | Target | Collection |
|-------|---------|-------------------|--------|------------|
| Jemaat submit | Status = `proses` | `surat_dibuat` | Jemaat (NIK) | `notifications` |
| Koordinator tolak | Status = `ditolak` | `surat_ditolak` | Jemaat (NIK) | `notifications` |
| Pendeta validasi | Status = `validated_by_pendeta` | `surat_masuk` | Jemaat (NIK) | `notifications` |

### Notifikasi Document Structure

```javascript
// 📄 Surat Dibuat
{
  type: "surat_dibuat",
  to_nik: "1234567890123456",
  title: "Surat Dibuat",
  message: "Pengajuan Surat Baptis Anda telah berhasil dibuat...",
  related_id: ObjectId("..."),  // pengajuan._id
  url: "pengajuan-detail.html?id=...",
  is_read: false
}

// ❌ Surat Ditolak
{
  type: "surat_ditolak",
  to_nik: "1234567890123456",
  title: "Surat Ditolak",
  message: "Pengajuan Surat Nikah Anda ditolak... Alasan: [rejection_note]",
  related_id: ObjectId("..."),
  url: "pengajuan-detail.html?id=...",
  is_read: false
}

// ✅ Surat Masuk
{
  type: "surat_masuk",
  to_nik: "1234567890123456",
  title: "Surat Masuk",
  message: "Pengajuan Surat Baptis Anda telah selesai diproses...",
  related_id: ObjectId("..."),
  url: "surat-masuk.html",
  is_read: false
}
```

---

## 📝 Timeline Mapping

### Aksi User → Timeline Entry

| Aksi | Timeline.action | Timeline.by | Timeline.note |
|------|-----------------|-------------|---------------|
| Jemaat submit | `"proses"` | `user_nama` | "Surat dibuat oleh jemaat" |
| Koordinator terima | `"diterima"` | Koordinator name | "Diverifikasi oleh Koordinator Rayon" |
| Koordinator tolak | `"ditolak"` | Koordinator name | `rejection_note` dari form |
| TU upload file | `"file_uploaded"` | TU name | "File [nama_file] berhasil diunggah" |
| TU disposisi Sekretaris | `"disposisi_to_sekretaris"` | TU name | "Diteruskan ke Sekretaris oleh Tata Usaha" |
| Sekretaris return | `"disposisi_to_tatausaha"` | Sekretaris name | `return_reason` dari form |
| Sekretaris forward | `"disposisi_to_pendeta"` | Sekretaris name | "Diteruskan ke Pendeta oleh Sekretaris" |
| Pendeta return | `"disposisi_to_tatausaha"` | Pendeta name | `return_reason` dari form |
| Pendeta validasi | `"validated_by_pendeta"` | Pendeta name | "Divalidasi final oleh Pendeta - Surat selesai" |

### Timeline Document Structure

```javascript
timeline: [
  {
    at: ISODate("2025-11-27T10:00:00Z"),
    by: "John Doe",  // dari currentUser.name atau role
    action: "proses",
    note: "Surat dibuat oleh jemaat"
  },
  // ... more entries
]
```

---

## 👥 Role Access Mapping

### Role → Query Filter

| Role | Filter MongoDB | Example Query |
|------|----------------|---------------|
| **Jemaat** | `user_nik` = own NIK | `db.pengajuans.find({ user_nik: "123..." })` |
| **Koordinator** | `rayon` = own rayon AND `status` = 'proses' | `db.pengajuans.find({ rayon: "Rayon A", status: "proses" })` |
| **Tata Usaha** | `status` IN ['diterima', 'disposisi_to_tatausaha'] | `db.pengajuans.find({ status: { $in: ["diterima", "disposisi_to_tatausaha"] } })` |
| **Sekretaris** | `status` = 'disposisi_to_sekretaris' | `db.pengajuans.find({ status: "disposisi_to_sekretaris" })` |
| **Pendeta** | `status` = 'disposisi_to_pendeta' | `db.pengajuans.find({ status: "disposisi_to_pendeta" })` |

---

## 🔐 Validation Mapping

### Frontend Validation → MongoDB Constraint

| Validation Rule | MongoDB Field | MongoDB Constraint |
|----------------|---------------|-------------------|
| Koordinator wajib isi alasan tolak | `rejection_note` | Required if status = 'ditolak' |
| Sekretaris wajib isi alasan return | `return_reason` | Required if action = 'disposisi_to_tatausaha' from Sekretaris |
| Pendeta wajib isi alasan return | `return_reason` | Required if action = 'disposisi_to_tatausaha' from Pendeta |
| TU wajib upload file | `final_file` | Required before status = 'disposisi_to_sekretaris' |
| File max 2MB | `final_file_size` | <= 2097152 bytes |
| NIK unique | `users.nik` | Unique index |
| Email unique | `users.email` | Unique index |
| Rayon untuk Koordinator | `rayon` query | Filter must match user's rayon |

---

## 📂 Data Flow

### 1. Pengajuan Baru (Jemaat)

```javascript
// Frontend POST /api/pengajuan
{
  user_id: currentUser.id,
  user_nik: currentUser.nik,
  user_nama: currentUser.name,
  user_email: currentUser.email,
  user_rayon: currentUser.rayon,
  rayon: currentUser.rayon,
  type: "surat-baptis",
  form: { /* data form */ },
  status: "proses"  // default
}

// Backend creates pengajuan + notification
pengajuan = await Pengajuan.create({ /* ... */ });
await Notification.create({
  type: "surat_dibuat",
  to_nik: user_nik,
  title: "Surat Dibuat",
  message: "Pengajuan ... telah berhasil dibuat...",
  related_id: pengajuan._id
});

// Timeline auto-added
pengajuan.timeline.push({
  at: new Date(),
  by: user_nama,
  action: "proses",
  note: "Surat dibuat oleh jemaat"
});
```

### 2. Koordinator Terima/Tolak

```javascript
// Frontend PUT /api/pengajuan/:id/status
{
  status: "diterima",  // or "ditolak"
  koor_note: "Data lengkap dan valid",
  rejection_note: null  // or "Alasan jika ditolak"
}

// Backend updates
pengajuan.status = "diterima";
pengajuan.koor_note = koor_note;
if (status === "ditolak") {
  pengajuan.rejection_note = rejection_note;  // WAJIB
  
  // Create notification
  await Notification.create({
    type: "surat_ditolak",
    to_nik: pengajuan.user_nik,
    title: "Surat Ditolak",
    message: `Pengajuan ... ditolak. Alasan: ${rejection_note}`,
    related_id: pengajuan._id
  });
}

// Add to timeline
pengajuan.timeline.push({
  at: new Date(),
  by: currentUser.name,
  action: status,
  note: status === "ditolak" ? rejection_note : "Diverifikasi oleh Koordinator Rayon"
});
```

### 3. Tata Usaha Upload & Disposisi

```javascript
// Frontend PUT /api/pengajuan/:id
{
  final_file: "base64...",
  final_file_name: "surat_baptis.pdf",
  final_file_type: "application/pdf",
  final_file_size: 245678
}

// Timeline
pengajuan.timeline.push({
  at: new Date(),
  by: currentUser.name,
  action: "file_uploaded",
  note: `File ${final_file_name} berhasil diunggah`
});

// Frontend PUT /api/pengajuan/:id/status
{ status: "disposisi_to_sekretaris" }

// Timeline
pengajuan.timeline.push({
  at: new Date(),
  by: currentUser.name,
  action: "disposisi_to_sekretaris",
  note: "Diteruskan ke Sekretaris oleh Tata Usaha"
});
```

### 4. Sekretaris Validasi/Return

```javascript
// Return
{
  status: "disposisi_to_tatausaha",
  return_reason: "Format tanggal salah"  // WAJIB
}

pengajuan.return_reason = return_reason;
pengajuan.timeline.push({
  at: new Date(),
  by: currentUser.name,
  action: "disposisi_to_tatausaha",
  note: `Dikembalikan ke Tata Usaha - ${return_reason}`
});

// Forward
{
  status: "disposisi_to_pendeta",
  sekretaris_note: "Format sudah sesuai"
}

pengajuan.sekretaris_note = sekretaris_note;
pengajuan.timeline.push({
  at: new Date(),
  by: currentUser.name,
  action: "disposisi_to_pendeta",
  note: "Diteruskan ke Pendeta oleh Sekretaris"
});
```

### 5. Pendeta Validasi Final

```javascript
// Validasi
{
  status: "validated_by_pendeta",
  pendeta_note: "Disetujui"
}

pengajuan.status = "validated_by_pendeta";
pengajuan.validated_at = new Date();
pengajuan.pendeta_note = pendeta_note;

pengajuan.timeline.push({
  at: new Date(),
  by: currentUser.name,
  action: "validated_by_pendeta",
  note: "Divalidasi final oleh Pendeta - Surat selesai"
});

// Create notification
await Notification.create({
  type: "surat_masuk",
  to_nik: pengajuan.user_nik,
  title: "Surat Masuk",
  message: "Pengajuan ... telah selesai diproses dan siap diambil.",
  related_id: pengajuan._id,
  url: "surat-masuk.html"
});
```

---

## 🔍 Query Examples per Role

### Jemaat - Lihat Pengajuan Sendiri

```javascript
// GET /api/pengajuan?user_nik=1234567890123456
db.pengajuans.find({
  user_nik: "1234567890123456"
}).sort({ created_at: -1 })
```

### Jemaat - Lihat Surat Masuk

```javascript
// GET /api/pengajuan?user_nik=1234567890123456&status=validated_by_pendeta
db.pengajuans.find({
  user_nik: "1234567890123456",
  status: "validated_by_pendeta"
}).sort({ validated_at: -1 })
```

### Jemaat - Lihat Notifikasi

```javascript
// GET /api/notifications?nik=1234567890123456
db.notifications.find({
  to_nik: "1234567890123456",
  is_read: false,
  type: { $in: ["surat_dibuat", "surat_ditolak", "surat_masuk"] }
}).sort({ tanggal: -1 }).limit(10)
```

### Koordinator - Lihat Surat Rayon Sendiri

```javascript
// GET /api/pengajuan?rayon=Rayon A&status=proses
db.pengajuans.find({
  rayon: "Rayon A",
  status: "proses"
}).sort({ created_at: -1 })
```

### Tata Usaha - Lihat Surat Masuk

```javascript
// GET /api/pengajuan?status=diterima,disposisi_to_tatausaha
db.pengajuans.find({
  status: { $in: ["diterima", "disposisi_to_tatausaha"] }
}).sort({ created_at: -1 })
```

### Sekretaris - Lihat Surat Disposisi

```javascript
// GET /api/pengajuan?status=disposisi_to_sekretaris
db.pengajuans.find({
  status: "disposisi_to_sekretaris"
}).sort({ created_at: -1 })
```

### Pendeta - Lihat Surat Disposisi

```javascript
// GET /api/pengajuan?status=disposisi_to_pendeta
db.pengajuans.find({
  status: "disposisi_to_pendeta"
}).sort({ created_at: -1 })
```

---

## 📊 Statistics Queries

### Count by Status

```javascript
db.pengajuans.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### Count by Rayon

```javascript
db.pengajuans.aggregate([
  { $group: { _id: "$rayon", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### Average Processing Time

```javascript
db.pengajuans.aggregate([
  {
    $match: { status: "validated_by_pendeta" }
  },
  {
    $project: {
      processingDays: {
        $divide: [
          { $subtract: ["$validated_at", "$created_at"] },
          1000 * 60 * 60 * 24
        ]
      }
    }
  },
  {
    $group: {
      _id: null,
      avgDays: { $avg: "$processingDays" }
    }
  }
])
```

---

## ✅ Implementation Checklist

- [x] **User Model** - Role-based dengan rayon support
- [x] **Pengajuan Model** - Status lengkap sesuai alur kerja
- [x] **Notification Model** - 3 tipe notifikasi jemaat
- [x] **Indexes** - Optimasi query untuk semua role
- [x] **Timeline Tracking** - Audit trail lengkap
- [x] **Validation** - Mandatory fields (rejection_note, return_reason)
- [x] **Access Control** - Filter berdasarkan role & rayon
- [ ] **Backend Controllers** - Implementasi business logic
- [ ] **API Endpoints** - REST API lengkap
- [ ] **Frontend Integration** - Connect dengan MongoDB backend
- [ ] **Testing** - Unit & integration tests

---

**Mapping Alur Kerja ke MongoDB - GMIT YEGAR**  
*Complete, Consistent, Correct*
