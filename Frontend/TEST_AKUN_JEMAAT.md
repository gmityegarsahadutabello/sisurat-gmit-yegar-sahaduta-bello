# 🧪 TEST PENGELOLAAN AKUN JEMAAT

## ✅ Masalah yang Diperbaiki

**Problem:** Admin tidak bisa mengelola akun Jemaat yang terdaftar melalui halaman registrasi
- ❌ Tombol "Lihat Detail" tidak berfungsi
- ❌ Tombol "Edit" tidak menampilkan data lengkap (NIK, Rayon hilang)
- ❌ Tombol "Hapus" tidak berfungsi

**Solution:** Menambahkan field NIK di modal edit/add dan update logic untuk support edit akun Jemaat

---

## 🔧 Yang Diperbaiki

### 1. **accounts.html**
- ✅ Menambahkan field NIK (#nik-field) dengan display:none
- ✅ Field ditampilkan kondisional hanya untuk role Jemaat

### 2. **accounts.js**
- ✅ `openAddModal()` - Reset field NIK dan hide field NIK
- ✅ `openEditModal()` - Populate NIK, show NIK untuk Jemaat, show Rayon untuk Jemaat & Koordinator
- ✅ `saveAccount()` - Validasi NIK untuk Jemaat, simpan NIK & Rayon saat create/update
- ✅ Event listener role change - Toggle visibility NIK & Rayon field
- ✅ URL encoding saat redirect ke detail page (`encodeURIComponent(id)`)

### 3. **account-detail.js & account-detail.html**
- ✅ Sudah diperbaiki di session sebelumnya
- ✅ Menampilkan semua field: Nama, Email, NIK, Role, Rayon, Created, Updated

---

## 🧪 Cara Testing

### **Persiapan**

1. **Buka Browser** (Chrome/Edge/Firefox)
2. **Buka file test-data-jemaat.html** untuk debug:
   ```
   file:///d:/KP%20SI%20SURAT%20YEGAR/Frontend/test-data-jemaat.html
   ```
3. **Klik "Cek Data"** untuk melihat data di localStorage

---

### **Test 1: Registrasi Jemaat Baru**

1. Buka `register.html`
2. Isi form dengan data test:
   - **Rayon:** 1
   - **NIK:** 1234567890123456
   - **Nama:** Test Jemaat 1
   - **Email:** jemaat1@test.com
   - **Password:** test123
   - **Konfirmasi Password:** test123
3. Klik **Daftar**
4. ✅ **Expected:** Berhasil registrasi, redirect ke index.html

---

### **Test 2: Login sebagai Admin**

1. Buka `index.html`
2. Login dengan:
   - **Email:** skyfranclyntheedens@gmail.com
   - **Password:** kp2025
3. ✅ **Expected:** Login berhasil, masuk dashboard admin

---

### **Test 3: Lihat Akun Jemaat di Tabel**

1. Di dashboard admin, klik menu **"Kelola Akun"**
2. ✅ **Expected:** Tabel menampilkan:
   - Kolom "Nama & Email" → **Test Jemaat 1** (bold) + jemaat1@test.com (kecil)
   - Kolom "Role" → Badge biru **Jemaat**
   - Kolom "Tanggal Dibuat" → Tanggal hari ini
3. Filter by Role → Pilih **"Jemaat"**
4. ✅ **Expected:** Hanya akun Jemaat yang ditampilkan

---

### **Test 4: Lihat Detail Akun Jemaat**

1. Klik tombol **👁️ (Lihat)** pada akun Jemaat
2. ✅ **Expected:** Halaman detail terbuka dengan data:
   - **Nama:** Test Jemaat 1
   - **Email:** jemaat1@test.com
   - **NIK:** 1234567890123456
   - **Role:** Badge biru "Jemaat"
   - **Rayon:** Rayon 1
   - **Tanggal Dibuat:** [timestamp]
   - **Tanggal Diperbarui:** [timestamp]

---

### **Test 5: Edit Akun Jemaat**

1. Di halaman detail, klik tombol **✏️ Edit Akun**
   - ATAU di tabel Kelola Akun, klik tombol **✏️ (Edit)**
2. ✅ **Expected:** Modal edit terbuka dengan data:
   - **Nama:** Test Jemaat 1 ✅
   - **Email:** jemaat1@test.com ✅
   - **NIK:** 1234567890123456 ✅ (Field NIK VISIBLE)
   - **Role:** Jemaat ✅ (Dropdown DISABLED - tidak bisa diubah)
   - **Rayon:** 1 ✅ (Field Rayon VISIBLE)
3. Ubah data:
   - **Nama:** Test Jemaat 1 (Updated)
   - **Rayon:** 2
4. Klik **Simpan**
5. ✅ **Expected:** Alert "Akun berhasil diperbarui"
6. Refresh halaman → Data ter-update

---

### **Test 6: Edit - Validasi NIK & Rayon Wajib**

1. Edit akun Jemaat
2. Kosongkan **NIK**
3. Klik **Simpan**
4. ✅ **Expected:** Alert "NIK wajib diisi untuk Jemaat"
5. Isi NIK, kosongkan **Rayon**
6. Klik **Simpan**
7. ✅ **Expected:** Alert "Rayon wajib diisi untuk Jemaat"

---

### **Test 7: Edit - Role Jemaat Tidak Bisa Diubah**

1. Edit akun Jemaat
2. ✅ **Expected:** Dropdown Role **DISABLED** (tidak bisa diklik)
3. Coba ubah lewat browser console:
   ```javascript
   document.getElementById('account-role').disabled = false;
   document.getElementById('account-role').value = 'koordinator';
   ```
4. Klik **Simpan**
5. ✅ **Expected:** Alert "Role akun Jemaat tidak dapat diubah ke role lain."

---

### **Test 8: Hapus Akun Jemaat**

1. Di halaman detail, klik tombol **🗑️ Hapus Akun**
   - ATAU di tabel Kelola Akun, klik tombol **🗑️ (Hapus)**
2. ✅ **Expected:** Modal konfirmasi muncul:
   ```
   Anda yakin ingin menghapus akun jemaat1@test.com (Jemaat)?
   ⚠️ Menghapus akun Jemaat akan menghapus semua pengajuan surat terkait.
   ```
3. Klik **Hapus**
4. ✅ **Expected:** 
   - Alert "Akun berhasil dihapus"
   - Akun hilang dari tabel

---

### **Test 9: Tambah Akun Jemaat Baru (Admin Create)**

1. Di halaman Kelola Akun, klik **+ Tambah Akun**
2. Pilih Role → **Jemaat**
3. ✅ **Expected:** 
   - Field **NIK** muncul
   - Field **Rayon** muncul
4. Isi data:
   - **Nama:** Jemaat Admin Created
   - **Email:** jemaat2@test.com
   - **NIK:** 9876543210987654
   - **Password:** admin123
   - **Role:** Jemaat
   - **Rayon:** 3
5. Klik **Simpan**
6. ✅ **Expected:** Alert "Akun berhasil ditambahkan"
7. Akun muncul di tabel dengan data lengkap

---

### **Test 10: Tambah Koordinator (Rayon Field)**

1. Klik **+ Tambah Akun**
2. Pilih Role → **Koordinator**
3. ✅ **Expected:** Field **Rayon** muncul, Field **NIK** TIDAK muncul
4. Isi data dan simpan
5. ✅ **Expected:** Akun Koordinator tersimpan dengan Rayon

---

### **Test 11: Edit Koordinator → Rayon Tetap Ada**

1. Edit akun Koordinator
2. ✅ **Expected:** Field **Rayon** visible dan terisi
3. Ubah Rayon dan simpan
4. ✅ **Expected:** Rayon ter-update

---

### **Test 12: Cek Data di Browser Console**

1. Buka **Browser Console** (F12)
2. Jalankan:
   ```javascript
   const users = JSON.parse(localStorage.getItem('users'));
   console.table(users);
   ```
3. ✅ **Expected:** Semua akun ditampilkan dengan field:
   - id, nama, email, nik (jemaat), role, rayon (jemaat & koordinator), password, created_at, updated_at

---

## 🐛 Troubleshooting

### **Masalah: "Akun tidak ditemukan" saat klik Detail**

**Penyebab:** ID tidak cocok atau URL encoding bermasalah

**Solusi:**
1. Buka test-data-jemaat.html → Cek Data
2. Copy ID akun yang bermasalah (contoh: `1234567890123456` — NIK akun)
3. Test manual:
   ```
   account-detail.html?id=1234567890123456
   ```
4. Cek browser console untuk error

---

### **Masalah: Field NIK tidak muncul saat Edit Jemaat**

**Penyebab:** JavaScript event listener belum load

**Solusi:**
1. Hard refresh (Ctrl+F5)
2. Clear cache browser
3. Cek browser console untuk error JavaScript

---

### **Masalah: Data tidak tersimpan setelah Edit**

**Penyebab:** localStorage full atau error saat save

**Solusi:**
1. Buka browser console
2. Jalankan:
   ```javascript
   try {
     localStorage.setItem('test', 'test');
     localStorage.removeItem('test');
     console.log('✅ localStorage berfungsi');
   } catch(e) {
     console.log('❌ localStorage error:', e.message);
   }
   ```
3. Jika error → Clear storage atau gunakan browser lain

---

## ✅ Checklist Lengkap

- [ ] Jemaat bisa registrasi sendiri
- [ ] Admin bisa login
- [ ] Tabel menampilkan Nama, Email, Role badge, Tanggal akun Jemaat
- [ ] Klik "Lihat" → Detail page terbuka dengan 7 field
- [ ] Klik "Edit" → Modal terbuka dengan NIK & Rayon field
- [ ] Edit Nama/Email/NIK/Rayon → Berhasil tersimpan
- [ ] Validasi NIK & Rayon wajib untuk Jemaat
- [ ] Role Jemaat tidak bisa diubah
- [ ] Klik "Hapus" → Akun terhapus dengan warning
- [ ] Admin bisa buat akun Jemaat baru (dengan NIK & Rayon)
- [ ] Admin bisa buat akun Koordinator (dengan Rayon, tanpa NIK)
- [ ] Field NIK & Rayon toggle otomatis saat ganti role

---

## 📝 Catatan Penting

1. **Master Admin tidak bisa dihapus** - Hardcoded di auth.js
2. **Role Jemaat locked** - Sekali Jemaat, tidak bisa diubah ke role lain (keamanan)
3. **NIK hanya untuk Jemaat** - Role lain tidak punya NIK
4. **Rayon untuk Jemaat & Koordinator** - Role lain tidak punya Rayon
5. **Password optional saat edit** - Kosongkan jika tidak ingin mengubah
6. **Data tersimpan di localStorage** - Tidak persistent jika clear browser data

---

## 🎯 Expected Behavior Summary

| Fitur | Jemaat | Koordinator | Staff Lain |
|-------|--------|-------------|------------|
| **Field NIK** | ✅ Wajib | ❌ Tidak ada | ❌ Tidak ada |
| **Field Rayon** | ✅ Wajib | ✅ Wajib | ❌ Tidak ada |
| **Role bisa diubah** | ❌ Locked | ✅ Ya | ✅ Ya |
| **Admin bisa edit** | ✅ Ya | ✅ Ya | ✅ Ya |
| **Admin bisa hapus** | ✅ Ya (Warning) | ✅ Ya | ✅ Ya |
| **Lihat Detail** | ✅ 7 fields | ✅ 6 fields | ✅ 5 fields |

---

**File Terkait:**
- `pages/admin/accounts.html` - Form modal dengan NIK field
- `assets/js/admin/accounts.js` - Logic CRUD dengan NIK & Rayon support
- `pages/admin/account-detail.html` - Detail view dengan 7 fields
- `assets/js/admin/account-detail.js` - Logic detail dengan NIK & Rayon display
- `test-data-jemaat.html` - Debugging tool

**Terakhir diupdate:** 28 November 2025
