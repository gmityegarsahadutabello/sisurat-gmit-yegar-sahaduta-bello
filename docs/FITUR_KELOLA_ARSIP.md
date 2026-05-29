# Fitur Kelola Arsip Surat - Admin & Informasi Storage

## 📋 Ringkasan Perubahan

Telah ditambahkan fitur baru untuk admin mengelola arsip surat dan informasi penyimpanan database untuk tatausaha.

---

## 🔧 Backend Changes

### 1. Storage Statistics Endpoint
**File**: `Backend/controllers/pengajuanController.js`
- **Endpoint**: `GET /api/pengajuan/stats/storage`
- **Fungsi**: Mendapatkan statistik penyimpanan database
- **Response**:
  ```json
  {
    "storage": {
      "used": 52428800,
      "limit": 524288000,
      "percent": 10.00,
      "usedMB": "50.00",
      "limitMB": 500,
      "available": 471859200,
      "availableMB": "450.00"
    },
    "database": {
      "name": "surat_jemaat",
      "collections": 3,
      "objects": 150,
      "dataSize": 45056000,
      "indexSize": 7372800
    },
    "pengajuan": {
      "total": 120,
      "archived": 45,
      "active": 75
    }
  }
  ```

### 2. Delete Archives Endpoint
**File**: `Backend/controllers/pengajuanController.js`
- **Endpoint**: `DELETE /api/pengajuan/archives`
- **Fungsi**: Menghapus arsip surat (single atau bulk)
- **Request Body**:
  - Hapus spesifik: `{ "ids": ["id1", "id2", ...] }`
  - Hapus semua: `{ "deleteAll": true }`
- **Safety**: Hanya menghapus pengajuan dengan status `arsip`

### 3. Routes Update
**File**: `Backend/routes/pengajuanRoutes.js`
- Menambahkan route untuk storage stats
- Menambahkan route untuk delete archives

---

## 🎨 Frontend Changes

### 1. Halaman Kelola Arsip (Admin)
**File**: `Frontend/pages/admin/kelola-arsip.html`

#### Fitur:
- ✅ **Storage Information Card**: Menampilkan usage database secara real-time
  - Storage terpakai (MB)
  - Storage tersedia (MB)
  - Total kapasitas (500 MB)
  - Persentase penggunaan dengan progress bar dinamis
  - Warna progress bar berubah berdasarkan usage:
    - Hijau-biru: < 70%
    - Kuning-merah: 70-89%
    - Merah: ≥ 90%

- ✅ **Daftar Arsip Surat**: Tabel dengan informasi lengkap
  - Nama Jemaat
  - Jenis Surat
  - Nomor Surat
  - Rayon
  - Tanggal Diarsipkan

- ✅ **Action Buttons**:
  - **Pilih Semua**: Select semua arsip di tabel
  - **Batal Pilih**: Deselect semua
  - **Hapus Terpilih**: Hapus arsip yang di-checklist
  - **Hapus Semua Arsip**: Hapus seluruh arsip (dengan double confirmation)
  - **Refresh**: Reload data

- ✅ **Search Functionality**: Cari arsip berdasarkan keyword
- ✅ **Checkbox Selection**: Pilih arsip individual untuk dihapus
- ✅ **Delete Confirmation**: Konfirmasi sebelum menghapus

**Script**: `Frontend/assets/js/admin/kelola-arsip.js`
- Load storage stats
- Load archived pengajuan
- Handle selection (single/bulk)
- Delete archives (single/bulk/all)
- Search functionality
- Toast notifications

### 2. Dashboard Tatausaha - Storage Info
**File**: `Frontend/pages/tatausaha/dashboard-tatausaha.html`

#### Penambahan:
- ✅ **Storage Info Card** di atas stats grid
  - Database icon
  - 4 kolom info: Terpakai, Tersedia, Kapasitas, Penggunaan
  - Progress bar dengan color coding
  - Helper text: "Jika penyimpanan penuh, hubungi admin untuk menghapus arsip"

**Script**: `Frontend/assets/js/tatausaha/dashboard-tatausaha.js`
- Load storage stats dari API
- Update UI dengan data storage
- Set warna progress bar berdasarkan usage

### 3. Dashboard Admin - Quick Actions
**File**: `Frontend/pages/admin/dashboard-admin.html`

#### Penambahan:
- ✅ Section "Aksi Cepat" dengan 2 tombol:
  - **Kelola Akun**: Link ke accounts.html
  - **Kelola Arsip Surat**: Link ke kelola-arsip.html (NEW)

---

## 🎯 Cara Menggunakan

### Untuk Admin:

1. **Akses Halaman Kelola Arsip**
   - Login sebagai admin
   - Dashboard Admin → Klik "Kelola Arsip Surat"
   - Atau langsung ke: `pages/admin/kelola-arsip.html`

2. **Melihat Storage Info**
   - Card berwarna ungu di atas menampilkan:
     - Total storage terpakai vs tersedia
     - Progress bar visual
     - Jumlah surat (total/arsip/aktif)

3. **Menghapus Arsip Tertentu**
   - Centang checkbox arsip yang ingin dihapus
   - Klik "Hapus Terpilih (n)"
   - Konfirmasi penghapusan

4. **Menghapus Semua Arsip**
   - Klik tombol merah "Hapus Semua Arsip"
   - Double confirmation untuk keamanan
   - Semua arsip akan terhapus permanen

5. **Search Arsip**
   - Ketik di search box untuk filter arsip
   - Real-time filtering

### Untuk Tatausaha:

1. **Melihat Storage Info**
   - Login sebagai tatausaha
   - Dashboard akan otomatis menampilkan storage info di card ungu
   - Informasi yang ditampilkan:
     - Storage terpakai
     - Storage tersedia
     - Persentase penggunaan
   - Jika hampir penuh (≥70%), progress bar berubah warna

2. **Tindakan Jika Storage Penuh**
   - Hubungi admin
   - Admin dapat menghapus arsip yang tidak diperlukan via "Kelola Arsip"

---

## ⚠️ Safety Features

1. **Status Check**: Hanya surat dengan status `arsip` yang dapat dihapus
2. **Double Confirmation**: "Hapus Semua" memerlukan 2x konfirmasi
3. **Admin-Only Access**: Hanya role admin yang dapat mengakses halaman kelola arsip
4. **Irreversible Warning**: User diberi peringatan bahwa data yang dihapus tidak dapat dikembalikan

---

## 🎨 UI/UX Highlights

- **Modern gradient design** dengan warna ungu-biru
- **Responsive layout** untuk mobile dan desktop
- **Interactive hover effects** pada table rows
- **Color-coded progress bar** untuk quick visual reference
- **Toast notifications** untuk feedback user actions
- **Loading states** saat fetch data
- **Empty state** jika tidak ada arsip
- **Search highlight** dan filtering real-time

---

## 📝 Technical Notes

### Database Size
- Default limit: **500 MB** (MongoDB free tier)
- Dapat diubah di `Backend/controllers/pengajuanController.js`:
  ```javascript
  const storageLimit = 500 * 1024 * 1024; // 500MB in bytes
  ```

### Status Flow
Surat masuk ke status `arsip` setelah:
- Status: `validated_by_pendeta`
- Status: `arsip`
- Flag: `archived = true`

### API Endpoints Summary
- `GET /api/pengajuan/stats/storage` - Get storage stats
- `DELETE /api/pengajuan/archives` - Delete archives
- `GET /api/pengajuan?status=arsip` - Get archived letters

---

## ✅ Checklist Implementasi

- [x] Backend storage stats endpoint
- [x] Backend delete archives endpoint
- [x] Admin kelola arsip page (HTML + JS)
- [x] Storage info card di tatausaha dashboard
- [x] Link dari admin dashboard ke kelola arsip
- [x] Search & filter functionality
- [x] Checkbox selection (single & bulk)
- [x] Delete confirmations
- [x] Toast notifications
- [x] Responsive design
- [x] Loading & error states
- [x] Documentation

---

## 🚀 Ready to Use!

Semua fitur sudah terimplementasi dan siap digunakan. Pastikan backend server berjalan dan database MongoDB terkoneksi.

**Test Flow**:
1. Login sebagai admin
2. Buka "Kelola Arsip Surat"
3. Lihat storage info dan list arsip
4. Test delete functionality
5. Login sebagai tatausaha
6. Verifikasi storage info muncul di dashboard
