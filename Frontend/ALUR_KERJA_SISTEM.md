# ALUR KERJA SISTEM SURAT - GMIT YEGAR

## 📋 Overview Sistem

Sistem manajemen surat gereja dengan alur persetujuan bertingkat dan tracking lengkap.

---

## 👥 Role & Akses

### 1. **JEMAAT**
- ✅ Mendaftar akun sendiri (registrasi mandiri)
- ✅ Mengajukan surat
- ✅ Melihat status pengajuan
- ✅ Menerima notifikasi (Surat Dibuat, Surat Ditolak, Surat Masuk)
- ✅ Melihat dan download surat yang sudah jadi
- 🔐 Setiap jemaat memiliki rayon

### 2. **KOORDINATOR RAYON**
- ✅ Memverifikasi surat **hanya dari jemaat rayon sendiri**
- ✅ Menerima atau menolak pengajuan (wajib isi alasan penolakan)
- ✅ Menambahkan catatan verifikasi
- 🚫 Tidak bisa mengakses surat dari rayon lain

### 3. **TATA USAHA**
- ✅ Menerima surat yang sudah diverifikasi koordinator
- ✅ Melihat detail surat pengajuan
- ✅ Membuat surat (diluar sistem)
- ✅ Upload file surat yang sudah dibuat
- ✅ Disposisi surat ke Sekretaris
- ✅ Menerima surat yang dikembalikan Sekretaris/Pendeta
- ✅ Melihat alasan pengembalian

### 4. **SEKRETARIS**
- ✅ Menerima surat dari Tata Usaha
- ✅ Mengecek/membaca surat
- ✅ **Mengembalikan** ke Tata Usaha jika ada kesalahan (wajib isi alasan)
- ✅ **Validasi dan disposisi** ke Pendeta jika sudah valid
- ✅ Menambahkan catatan

### 5. **PENDETA**
- ✅ Validator terakhir
- ✅ Menerima surat dari Sekretaris
- ✅ Mengecek/membaca surat
- ✅ **Mengembalikan** ke Tata Usaha jika ada kesalahan (wajib isi alasan)
- ✅ **Validasi final** - surat selesai dan dikirim ke jemaat
- ✅ Menambahkan catatan validasi

### 6. **ADMIN**
- ✅ Mengelola akun (CRUD): Koordinator, Tata Usaha, Sekretaris, Pendeta
- ✅ Mengubah password dan email jemaat
- ✅ Menghapus akun jemaat
- 🚫 Tidak bisa mendaftarkan akun jemaat (jemaat harus registrasi sendiri)

---

## 🔄 ALUR LENGKAP SURAT

### **FASE 1: Pengajuan Jemaat**
1. **Jemaat** membuat pengajuan surat
   - Status: `proses`
   - Tracking: "Surat dibuat oleh jemaat"
   - Notifikasi: **"Surat Dibuat"** ✅

### **FASE 2: Verifikasi Koordinator Rayon**
2. **Koordinator Rayon** menerima pengajuan dari jemaat rayonnya
   - Koordinator hanya bisa melihat surat dari jemaat rayon sendiri
   - Filter otomatis berdasarkan rayon
   
3a. **Jika DITERIMA:**
   - Status: `diterima`
   - Tracking: "Diverifikasi oleh Koordinator Rayon"
   - Surat diteruskan ke Tata Usaha

3b. **Jika DITOLAK:**
   - Status: `ditolak`
   - Tracking: "Ditolak oleh Koordinator Rayon - [alasan]"
   - Notifikasi ke jemaat: **"Surat Ditolak"** ❌
   - Jemaat dapat melihat alasan penolakan di detail pengajuan
   - Jemaat bisa mengajukan ulang setelah perbaikan

### **FASE 3: Pembuatan Surat oleh Tata Usaha**
4. **Tata Usaha** menerima surat yang sudah diverifikasi
   - Melihat detail pengajuan
   - Membuat surat (diluar sistem - Word/Excel/etc)
   
5. **Upload File Surat**
   - Status: tetap `diterima`
   - Tracking: "File surat [nama file] berhasil diunggah"
   - Format: PDF, Word, JPG (max 2MB)
   
6. **Disposisi ke Sekretaris**
   - Status: `disposisi_to_sekretaris`
   - Tracking: "Diteruskan ke Sekretaris oleh Tata Usaha"

### **FASE 4: Validasi Sekretaris**
7. **Sekretaris** menerima dan membaca surat

8a. **Jika ada KESALAHAN:**
   - Sekretaris klik "Kembalikan ke Tata Usaha"
   - **WAJIB** isi alasan pengembalian
   - Status: `disposisi_to_tatausaha`
   - Tracking: "Dikembalikan ke Tata Usaha - [alasan]"
   - Tata Usaha melihat alasan dengan alert merah
   - Tata Usaha perbaiki dan upload ulang

8b. **Jika VALID:**
   - Sekretaris klik "Validasi dan Teruskan ke Pendeta"
   - Status: `disposisi_to_pendeta`
   - Tracking: "Diteruskan ke Pendeta oleh Sekretaris"
   - Optional: tambahkan catatan

### **FASE 5: Validasi Final Pendeta**
9. **Pendeta** menerima dan membaca surat (validator terakhir)

10a. **Jika ada KESALAHAN:**
   - Pendeta klik "Kembalikan ke Tata Usaha"
   - **WAJIB** isi alasan pengembalian
   - Status: `disposisi_to_tatausaha`
   - Tracking: "Dikembalikan ke Tata Usaha - [alasan]"
   - Tata Usaha melihat alasan dengan alert merah
   - Tata Usaha perbaiki dan upload ulang

10b. **Jika VALID (Validasi Final):**
   - Pendeta klik "Validasi Final"
   - Status: `validated_by_pendeta`
   - Tracking: "Divalidasi final oleh Pendeta - Surat selesai"
   - Notifikasi ke jemaat: **"Surat Masuk"** ✅
   - Surat masuk ke daftar surat jemaat

### **FASE 6: Surat Masuk Jemaat**
11. **Jemaat** menerima notifikasi "Surat Masuk"
    - Klik notifikasi → masuk ke daftar surat masuk
    - Surat terbaru di urutan **paling atas** (nomor 1)
    - Sorting: berdasarkan tanggal validasi (descending)

12. **Jemaat melihat detail dan download**
    - Tombol **"Lihat"** → detail pengajuan + tracking lengkap
    - Tombol **"Download"** → download file surat

---

## 📊 TRACKING & TIMELINE

Setiap perubahan status tercatat otomatis dengan informasi:
- ⏰ **Timestamp** (tanggal & waktu)
- 👤 **Actor** (siapa yang melakukan)
- 🎯 **Action** (apa yang dilakukan)
- 📝 **Note** (catatan/alasan jika ada)

### Contoh Timeline Lengkap:
```
1. Surat dibuat oleh jemaat
   2025-11-27 10:00 | by: jemaat

2. Diverifikasi oleh Koordinator Rayon
   2025-11-27 14:30 | by: koordinator

3. File surat uploaded.pdf berhasil diunggah
   2025-11-28 09:15 | by: tatausaha

4. Diteruskan ke Sekretaris oleh Tata Usaha
   2025-11-28 09:20 | by: tatausaha

5. Dikembalikan ke Tata Usaha - Format tanggal salah
   2025-11-28 11:00 | by: sekretaris

6. File surat uploaded_revisi.pdf berhasil diunggah
   2025-11-28 13:45 | by: tatausaha

7. Diteruskan ke Sekretaris oleh Tata Usaha
   2025-11-28 13:50 | by: tatausaha

8. Diteruskan ke Pendeta oleh Sekretaris
   2025-11-28 15:20 | by: sekretaris

9. Divalidasi final oleh Pendeta - Surat selesai
   2025-11-29 08:30 | by: pendeta
```

---

## 🔔 SISTEM NOTIFIKASI JEMAAT

### Tipe Notifikasi:
1. **Surat Dibuat** 📄
   - Icon: Biru
   - Trigger: Saat jemaat submit pengajuan
   - Pesan: "Pengajuan [jenis surat] Anda telah berhasil dibuat dan akan diproses oleh Koordinator Rayon."

2. **Surat Ditolak** ❌
   - Icon: Merah
   - Trigger: Koordinator tolak pengajuan
   - Pesan: "Pengajuan [jenis surat] Anda ditolak oleh Koordinator Rayon. Alasan: [catatan]"
   - Link: Langsung ke detail pengajuan

3. **Surat Masuk** ✅
   - Icon: Hijau
   - Trigger: Pendeta validasi final
   - Pesan: "Pengajuan [jenis surat] Anda telah selesai diproses dan siap diambil."
   - Link: Langsung ke detail pengajuan

### Fitur Notifikasi:
- ✅ Dropdown di navbar dengan badge counter
- ✅ Filter berdasarkan NIK jemaat
- ✅ Sorted terbaru di atas
- ✅ Animasi badge saat ada notifikasi baru
- ✅ Limit 10 notifikasi terbaru

---

## 🔐 VALIDASI & KEAMANAN

### Koordinator Rayon:
- ✅ Filter otomatis berdasarkan rayon
- ✅ Validasi: hanya bisa verifikasi surat dari rayon sendiri
- ✅ Error message jika coba akses surat rayon lain

### Tata Usaha:
- ✅ Wajib upload file sebelum disposisi
- ✅ Validasi tipe file (PDF, Word, JPG)
- ✅ Max size 2MB

### Sekretaris & Pendeta:
- ✅ **Wajib** isi alasan jika mengembalikan surat
- ✅ Validasi: tidak bisa return tanpa alasan
- ✅ Alert & focus ke textarea jika kosong
- ✅ Border kuning sebagai indikator mandatory

### Jemaat:
- ✅ Filter surat berdasarkan NIK
- ✅ Hanya melihat surat milik sendiri
- ✅ Download hanya jika file tersedia

---

## 📁 STRUKTUR DATA

### Pengajuan Surat:
```javascript
{
  id: "pengajuan_xxx",
  pemohon_nik: "xxx", // untuk filter jemaat
  rayon: "1", // untuk filter koordinator
  status: "proses|diterima|ditolak|disposisi_to_sekretaris|disposisi_to_pendeta|disposisi_to_tatausaha|validated_by_pendeta",
  jenis: "saksi-nikah|rekomendasi|...",
  final_file: "base64...", // file surat yang diupload
  final_file_name: "surat.pdf",
  createdAt: "2025-11-27T10:00:00Z",
  validated_at: "2025-11-29T08:30:00Z",
  timeline: [
    {
      at: "2025-11-27T10:00:00Z",
      by: "jemaat|koordinator|tatausaha|sekretaris|pendeta",
      action: "proses|diterima|...",
      note: "catatan/alasan",
      tanggal: "...",
      keterangan: "Friendly description"
    }
  ]
}
```

### Notifikasi:
```javascript
{
  id: "notif_xxx",
  to: "jemaat",
  nik: "xxx", // NIK jemaat penerima
  type: "surat_dibuat|surat_ditolak|surat_masuk",
  related: "pengajuan_id",
  judul: "Surat Dibuat|Surat Ditolak|Surat Masuk",
  pesan: "Message...",
  url: "pengajuan-detail.html?id=xxx",
  read: false,
  at: "2025-11-27T10:00:00Z"
}
```

---

## 🎯 STATUS SURAT

| Status | Keterangan | Akses |
|--------|------------|-------|
| `proses` | Baru diajukan jemaat | Koordinator |
| `diterima` | Diverifikasi koordinator | Tata Usaha |
| `ditolak` | Ditolak koordinator | Jemaat (bisa ajukan ulang) |
| `disposisi_to_sekretaris` | Dikirim ke Sekretaris | Sekretaris |
| `disposisi_to_pendeta` | Dikirim ke Pendeta | Pendeta |
| `disposisi_to_tatausaha` | Dikembalikan ke Tata Usaha | Tata Usaha |
| `validated_by_pendeta` | Selesai (final) | Jemaat (download) |

---

## 📝 CATATAN PENTING

1. **Rayon Enforcement**: Koordinator **HANYA** bisa verifikasi surat dari rayon sendiri
2. **Mandatory Rejection Reason**: Sekretaris & Pendeta **WAJIB** isi alasan saat return
3. **Tracking Lengkap**: Semua aksi tercatat otomatis dengan timestamp dan actor
4. **Notifikasi Real-time**: Jemaat dapat update status via notifikasi
5. **Sort Terbaru**: Surat masuk jemaat sorted descending (terbaru di atas)
6. **File Validation**: Upload hanya PDF, Word, JPG max 2MB
7. **No Backend**: Semua data di localStorage (mode offline)

---

## 🔧 FILE YANG DIMODIFIKASI

### JavaScript:
1. `assets/js/api.js` - Helper LS dengan tracking lengkap
2. `assets/js/navbar.js` - Notifikasi jemaat
3. `assets/js/surat-masuk.js` - Daftar surat masuk jemaat
4. `assets/js/pengajuan.js` - Submit pengajuan + notifikasi
5. `assets/js/pengajuan-detail.js` - Alert penolakan koordinator
6. `assets/js/koordinator/daftar-surat-masuk.js` - Verifikasi rayon
7. `assets/js/tatausaha/detail-surat.js` - Upload file + tracking
8. `pages/sekretaris/detail-preview.html` - Validasi mandatory
9. `pages/pendeta/detail-preview.html` - Validasi mandatory

### HTML:
1. `assets/components/navbar.html` - Dropdown notifikasi

### CSS:
1. `assets/css/navbar.css` - Styling notifikasi dropdown

---

## ✅ TESTING CHECKLIST

- [ ] Jemaat registrasi akun sendiri
- [ ] Jemaat submit pengajuan → notifikasi "Surat Dibuat"
- [ ] Koordinator rayon 1 hanya lihat surat rayon 1
- [ ] Koordinator tolak → jemaat dapat notifikasi + lihat alasan
- [ ] Koordinator terima → surat ke Tata Usaha
- [ ] Tata Usaha upload file → tracking tercatat
- [ ] Tata Usaha disposisi ke Sekretaris
- [ ] Sekretaris return tanpa alasan → error
- [ ] Sekretaris return dengan alasan → Tata Usaha lihat alert
- [ ] Sekretaris forward → surat ke Pendeta
- [ ] Pendeta return tanpa alasan → error
- [ ] Pendeta return dengan alasan → Tata Usaha lihat alert
- [ ] Pendeta validasi final → notifikasi "Surat Masuk" ke jemaat
- [ ] Jemaat lihat surat masuk (terbaru di atas)
- [ ] Jemaat klik "Lihat" → detail + tracking
- [ ] Jemaat klik "Download" → download file
- [ ] Admin kelola akun koordinator/staff
- [ ] Admin ubah password jemaat
- [ ] Admin tidak bisa daftar akun jemaat

---

**Sistem Surat GMIT YEGAR - Terstruktur, Tertracking, Transparan**
