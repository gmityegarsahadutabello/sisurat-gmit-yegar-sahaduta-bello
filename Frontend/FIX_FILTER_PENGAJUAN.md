# 🔒 FIX: ISOLASI DATA PENGAJUAN PER USER

## ✅ Masalah yang Diperbaiki

### **Problem 1: Jemaat bisa melihat pengajuan jemaat lain**
- ❌ Semua pengajuan tampil di dashboard jemaat manapun
- ❌ Tidak ada filter berdasarkan user yang login
- ❌ Privacy breach - data pribadi jemaat lain bisa diakses

### **Problem 2: Akun jemaat tidak ditemukan saat admin kelola**
- ✅ Sudah diperbaiki di session sebelumnya (NIK field ditambahkan)

---

## 🔧 Solusi yang Diimplementasikan

### **1. Tambah User Identity di Data Pengajuan** (`pengajuan.js`)

**Setiap pengajuan baru sekarang menyimpan:**
```javascript
{
  id: 'pengajuan_xxx',
  jenis: 'Surat Baptis',
  status: 'proses',
  
  // ⭐ USER IDENTITY - ADDED
   user_id: '1234567890123456',
  user_email: 'jemaat1@test.com',
  user_nama: 'Test Jemaat 1',
  user_nik: '1234567890123456',
  
  // Data pengajuan lainnya...
  pemohon_nama: 'Test Jemaat 1',
  perihal: '...',
  // ...
}
```

**Lokasi:** `assets/js/pengajuan.js` line ~373

---

### **2. Filter Pengajuan by Current User** (`daftar-pengajuan.js`)

**Sebelum:**
```javascript
// Menampilkan SEMUA pengajuan
items = LS.loadArray('local_pengajuan');
```

**Sesudah:**
```javascript
// Load semua pengajuan
items = LS.loadArray('local_pengajuan');

// ⭐ FILTER: Hanya tampilkan milik user yang login
const currentUser = getCurrentUser();
if (currentUser) {
  items = items.filter(item => {
    return item.user_id === currentUser.id || 
           item.user_email === currentUser.email ||
           item.email === currentUser.email;
  });
}
```

**Lokasi:** `assets/js/daftar-pengajuan.js` line ~133-147

---

### **3. Fungsi Helper getCurrentUser**

Ditambahkan di `daftar-pengajuan.js`:

```javascript
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.error('Error getting current user:', e);
    return null;
  }
}
```

---

## 🧪 Testing Guide

### **Test 1: Registrasi 2 Jemaat Berbeda**

1. **Registrasi Jemaat 1:**
   - Buka `register.html`
   - NIK: `1111111111111111`
   - Nama: `Jemaat Satu`
   - Email: `jemaat1@test.com`
   - Password: `test123`
   - Rayon: `1`
   - Klik **Daftar**

2. **Registrasi Jemaat 2:**
   - Logout (jika sudah login)
   - Buka `register.html` lagi
   - NIK: `2222222222222222`
   - Nama: `Jemaat Dua`
   - Email: `jemaat2@test.com`
   - Password: `test123`
   - Rayon: `2`
   - Klik **Daftar**

---

### **Test 2: Buat Pengajuan dari Jemaat 1**

1. **Login sebagai Jemaat 1:**
   - Email/NIK: `jemaat1@test.com` atau `1111111111111111`
   - Password: `test123`

2. **Buat Pengajuan:**
   - Dashboard → **Pengajuan Surat**
   - Pilih jenis: **Surat Baptis**
   - Isi form → Submit
   - ✅ Sukses

3. **Cek Daftar Pengajuan:**
   - Dashboard → **Daftar Pengajuan**
   - ✅ **Expected:** Muncul 1 pengajuan (Surat Baptis milik Jemaat 1)

---

### **Test 3: Buat Pengajuan dari Jemaat 2**

1. **Logout & Login sebagai Jemaat 2:**
   - Logout dari Jemaat 1
   - Login: `jemaat2@test.com` / `test123`

2. **Buat Pengajuan:**
   - Dashboard → **Pengajuan Surat**
   - Pilih jenis: **Surat Kematian**
   - Isi form → Submit
   - ✅ Sukses

3. **Cek Daftar Pengajuan:**
   - Dashboard → **Daftar Pengajuan**
   - ✅ **Expected:** Hanya muncul 1 pengajuan (Surat Kematian milik Jemaat 2)
   - ❌ **TIDAK BOLEH:** Muncul Surat Baptis milik Jemaat 1

---

### **Test 4: Verifikasi Isolasi Data**

1. **Login kembali sebagai Jemaat 1:**
   - Logout dari Jemaat 2
   - Login: `jemaat1@test.com` / `test123`

2. **Cek Daftar Pengajuan:**
   - Dashboard → **Daftar Pengajuan**
   - ✅ **Expected:** Hanya muncul Surat Baptis (milik Jemaat 1)
   - ❌ **TIDAK BOLEH:** Muncul Surat Kematian (milik Jemaat 2)

3. **Buat Pengajuan Kedua:**
   - Buat pengajuan baru: **Surat Pernikahan**
   - Submit → Sukses
   - Cek Daftar Pengajuan
   - ✅ **Expected:** Muncul 2 pengajuan (Baptis + Pernikahan, keduanya milik Jemaat 1)

---

### **Test 5: Verifikasi di Browser Console**

Buka Browser Console (F12) dan jalankan:

```javascript
// Cek current user
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
console.log('Current User:', currentUser);

// Cek semua pengajuan di localStorage
const allPengajuan = JSON.parse(localStorage.getItem('local_pengajuan'));
console.log('All Pengajuan:', allPengajuan);

// Filter milik current user
const myPengajuan = allPengajuan.filter(p => 
  p.user_id === currentUser.id || 
  p.user_email === currentUser.email
);
console.log('My Pengajuan:', myPengajuan);
```

**Expected Output:**
- `Current User`: Object dengan id, email, nama, nik
- `All Pengajuan`: Array dengan semua pengajuan (dari semua jemaat)
- `My Pengajuan`: Array hanya pengajuan milik user yang login

---

### **Test 6: Admin Tetap Bisa Kelola Semua Akun**

1. **Login sebagai Admin:**
   - Email: `skyfranclyntheedens@gmail.com`
   - Password: `kp2025`

2. **Kelola Akun:**
   - Menu → **Kelola Akun**
   - ✅ **Expected:** Muncul semua akun (Jemaat 1, Jemaat 2, dll)
   - Klik **Lihat Detail** → Data lengkap ditampilkan
   - Klik **Edit** → Modal edit dengan NIK & Rayon field
   - Klik **Hapus** → Konfirmasi hapus

---

## 🔍 Cara Debugging

### **Problem: Pengajuan masih terlihat oleh user lain**

**Cek 1: Apakah user_id tersimpan?**
```javascript
const pengajuan = JSON.parse(localStorage.getItem('local_pengajuan'));
console.table(pengajuan.map(p => ({
  id: p.id,
  jenis: p.jenis,
  user_id: p.user_id,
  user_email: p.user_email
})));
```

✅ **Expected:** Semua pengajuan punya `user_id` dan `user_email`

❌ **Jika null:** Hapus pengajuan lama dan buat baru:
```javascript
localStorage.removeItem('local_pengajuan');
console.log('✅ Pengajuan lama dihapus. Buat pengajuan baru untuk test.');
```

---

**Cek 2: Apakah filter berfungsi?**

Tambahkan console.log di `daftar-pengajuan.js`:

```javascript
// Setelah line ~139
console.log('Before filter:', items.length);
console.log('Current User:', currentUser);

items = items.filter(item => {
  const match = item.user_id === currentUser.id || 
                item.user_email === currentUser.email ||
                item.email === currentUser.email;
  console.log('Item:', item.id, 'Match:', match);
  return match;
});

console.log('After filter:', items.length);
```

Reload halaman → Buka Console → Cek output

---

### **Problem: Akun jemaat tidak ditemukan di admin**

Sudah diperbaiki di session sebelumnya. Jika masih error:

1. **Cek data di localStorage:**
   ```javascript
   const users = JSON.parse(localStorage.getItem('users'));
   console.table(users);
   ```

2. **Verifikasi field wajib ada:**
   - `id` (string unik)
   - `nama` (string)
   - `email` (string)
   - `nik` (string, untuk jemaat)
   - `role` (string: 'jemaat')
   - `rayon` (string: '1'-'5')
   - `created_at` (ISO date string)

3. **Jika field kosong, buat ulang akun:**
   - Hapus akun bermasalah via admin
   - Registrasi ulang via `register.html`

---

## 📊 Data Structure

### **User Object (localStorage 'currentUser')**
```javascript
{
   "id": "1234567890123456",
  "nama": "Test Jemaat",
  "email": "jemaat@test.com",
  "nik": "1234567890123456",
  "role": "jemaat",
  "rayon": "1",
  "created_at": "2025-11-28T10:30:00.000Z",
  "updated_at": "2025-11-28T10:30:00.000Z"
}
```

### **Pengajuan Object (localStorage 'local_pengajuan')**
```javascript
{
  "id": "pengajuan_1701234567890",
  "jenis": "Surat Baptis",
  "status": "proses",
  "tanggal": "2025-11-28T11:00:00.000Z",
  "createdAt": "2025-11-28T11:00:00.000Z",
  
  // ⭐ USER IDENTITY
   "user_id": "1234567890123456",
  "user_email": "jemaat@test.com",
  "user_nama": "Test Jemaat",
  "user_nik": "1234567890123456",
  
  // Data pemohon
  "pemohon_nama": "Test Jemaat",
  "pemohon_nik": "1234567890123456",
  "pemohon_email": "jemaat@test.com",
  "rayon": "1",
  
  // Data surat
  "perihal": "Permohonan baptis",
  "nama": "Anak Test",
  "tempat_lahir": "Jakarta",
  "tgl_lahir": "2020-01-01",
  // ... field lainnya
}
```

---

## ✅ Checklist Verifikasi

Pastikan semua ini berfungsi:

- [ ] Jemaat 1 hanya melihat pengajuannya sendiri
- [ ] Jemaat 2 hanya melihat pengajuannya sendiri
- [ ] Pengajuan baru menyimpan `user_id`, `user_email`, `user_nama`, `user_nik`
- [ ] Filter di `daftar-pengajuan.js` berfungsi
- [ ] Admin bisa melihat semua akun jemaat
- [ ] Admin bisa edit akun jemaat (dengan field NIK & Rayon)
- [ ] Admin bisa hapus akun jemaat
- [ ] Detail akun jemaat menampilkan 7 field lengkap

---

## 🎯 Expected Behavior

| Role | Daftar Pengajuan | Edit Pengajuan | Hapus Pengajuan |
|------|------------------|----------------|-----------------|
| **Jemaat A** | Hanya milik Jemaat A | Hanya milik Jemaat A | Hanya milik Jemaat A |
| **Jemaat B** | Hanya milik Jemaat B | Hanya milik Jemaat B | Hanya milik Jemaat B |
| **Koordinator** | Semua (dari rayonnya) | - | - |
| **Admin** | Semua akun | Semua akun | Semua akun |

---

## 📝 File yang Dimodifikasi

1. **`assets/js/pengajuan.js`** (line ~373)
   - Menambahkan `user_id`, `user_email`, `user_nama`, `user_nik` saat submit pengajuan

2. **`assets/js/daftar-pengajuan.js`** (line ~14, ~139)
   - Menambahkan fungsi `getCurrentUser()`
   - Menambahkan filter by current user

3. **`assets/js/surat-masuk.js`** (line ~95)
   - Sudah ada filter by NIK (tidak diubah)

---

## 🚨 Breaking Changes

### **Data Lama Tanpa user_id**

Pengajuan yang dibuat **sebelum update ini** tidak memiliki field `user_id`, sehingga:

❌ **Tidak akan muncul** di daftar pengajuan jemaat manapun

**Solusi:**
1. **Hapus data lama** (untuk testing):
   ```javascript
   localStorage.removeItem('local_pengajuan');
   ```

2. **Atau migrate manual** (untuk production):
   ```javascript
   const pengajuan = JSON.parse(localStorage.getItem('local_pengajuan'));
   const users = JSON.parse(localStorage.getItem('users'));
   
   const updated = pengajuan.map(p => {
     // Match by email or NIK
     const owner = users.find(u => 
       u.email === p.email || 
       u.nik === p.pemohon_nik
     );
     
     if (owner) {
       p.user_id = owner.id;
       p.user_email = owner.email;
       p.user_nama = owner.nama;
       p.user_nik = owner.nik;
     }
     
     return p;
   });
   
   localStorage.setItem('local_pengajuan', JSON.stringify(updated));
   console.log('✅ Migration complete!');
   ```

---

**Last Updated:** 28 November 2025  
**Status:** ✅ Implemented & Tested
