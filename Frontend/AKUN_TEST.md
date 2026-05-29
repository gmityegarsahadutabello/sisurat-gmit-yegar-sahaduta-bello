# AKUN MASTER ADMIN - SISTEM SURAT GMIT YEGAR

## 📌 Cara Login

1. Buka `index.html` di browser
2. Gunakan **Email** sebagai identity
3. Masukkan password
4. Sistem akan otomatis redirect ke dashboard sesuai role

---

## 🔐 MASTER ADMIN CREDENTIAL

### Super Administrator (Tidak Dapat Dihapus)
```
Email: skyfranclyntheedens@gmail.com
Password: kp2025
Role: admin
Dashboard: pages/admin/dashboard-admin.html
```

**⚠️ PENTING:**
- Kredensial ini **HARDCODED** di sistem dan tidak dapat diubah/dihapus
- Gunakan akun ini jika lupa password admin lain
- Jangan bagikan kredensial ini ke pihak yang tidak berwenang

---

## 👥 PENGELOLAAN AKUN

### 1. **JEMAAT**
- ✅ **Registrasi Mandiri** melalui halaman `register.html`
- ✅ Data akun otomatis tersimpan di `localStorage` key `users`
- ✅ Setelah registrasi, jemaat dapat login di `index.html`
- ❌ **Admin TIDAK DAPAT** mendaftarkan akun Jemaat
- 🔐 Setiap jemaat memiliki rayon

**Cara Jemaat Mendaftar:**
1. Buka `register.html`
2. Isi form: Rayon, NIK, Nama, Email, Password
3. Klik "Daftar"
4. Akun otomatis tersimpan ke localStorage
5. Login di `index.html`

### 2. **STAFF (Koordinator, Tata Usaha, Sekretaris, Pendeta)**
- ✅ **Didaftarkan oleh Admin** melalui halaman `pages/admin/accounts.html`
- ✅ Data akun otomatis tersimpan di `localStorage` key `users`
- ✅ Setelah didaftarkan, staff dapat login di `index.html`
- ✅ Admin dapat CRUD (Create, Read, Update, Delete) akun staff
- ❌ Admin **TIDAK DAPAT** mengubah role staff menjadi Jemaat atau sebaliknya

**Cara Admin Mendaftarkan Staff:**
1. Login sebagai Admin
2. Buka menu "Kelola Akun" (`pages/admin/accounts.html`)
3. Klik tombol "Tambah Akun"
4. Isi form: Email, Password, Role (pilih salah satu: Koordinator, Tata Usaha, Sekretaris, Pendeta)
5. Klik "Simpan"
6. Akun staff otomatis tersimpan ke localStorage
7. Staff dapat login menggunakan email dan password yang didaftarkan

---

## 🔄 Flow Sistem

### Registrasi Jemaat
```
1. Jemaat buka register.html
2. Isi form registrasi
3. Validasi (NIK unique, email unique)
4. Simpan ke localStorage key 'users' dengan role 'jemaat'
5. Redirect ke index.html untuk login
```

### Pembuatan Akun Staff oleh Admin
```
1. Admin login ke dashboard
2. Admin buka Kelola Akun
3. Klik "Tambah Akun"
4. Pilih role: koordinator / tatausaha / sekretaris / pendeta
5. Simpan ke localStorage key 'users'
6. Staff dapat login di index.html
```

### Login Multi-Role
```
1. User (Jemaat/Staff) buka index.html
2. Input email/NIK dan password
3. Sistem cek:
   - Master Admin credential (hardcoded)
   - localStorage key 'users' (akun yang didaftarkan)
   - Server API (jika ada)
4. Jika match → simpan currentUser ke localStorage
5. Redirect ke dashboard sesuai role:
   - jemaat → dashboard.html
   - koordinator → pages/koordinator/dashboard.html
   - tatausaha → pages/tatausaha/dashboard-tatausaha.html
   - sekretaris → pages/sekretaris/dashboard-sekretaris.html
   - pendeta → pages/pendeta/dashboard-pendeta.html
   - admin → pages/admin/dashboard-admin.html
```

---

## 📂 Struktur localStorage

### Key: `users`
Menyimpan semua akun (Jemaat dan Staff):

```json
[
  {
    "id": "1234567890123456",
    "rayon": "1",
    "nik": "1234567890",
    "nama": "John Doe",
    "email": "john@example.com",
    "password": "hashed_password",
    "role": "jemaat",
    "created_at": "2025-11-28T10:00:00.000Z",
    "updated_at": "2025-11-28T10:00:00.000Z"
  },
  {
    "id": "user_1732800100000_xyz789",
    "email": "koordinator@example.com",
    "password": "hashed_password",
    "role": "koordinator",
    "rayon": "1",
    "created_at": "2025-11-28T10:05:00.000Z",
    "updated_at": "2025-11-28T10:05:00.000Z"
  }
]
```

### Key: `currentUser`
Menyimpan data user yang sedang login (tanpa password):

```json
  {
    "id": "1234567890123456",
  "nama": "John Doe",
  "email": "john@example.com",
  "nik": "1234567890",
  "rayon": "1",
  "role": "jemaat"
}
```

---

## 🧪 Testing Checklist

### Testing Master Admin
- [ ] Login dengan `skyfranclyntheedens@gmail.com` / `kp2025`
- [ ] Masuk ke `pages/admin/dashboard-admin.html`
- [ ] Akses menu "Kelola Akun"
- [ ] Buat akun Koordinator baru
- [ ] Buat akun Tata Usaha baru
- [ ] Buat akun Sekretaris baru
- [ ] Buat akun Pendeta baru
- [ ] Coba buat akun Jemaat → harus ditolak

### Testing Registrasi Jemaat
- [ ] Buka `register.html`
- [ ] Isi form lengkap
- [ ] Submit → cek apakah tersimpan di localStorage key 'users'
- [ ] Login dengan email/NIK yang baru didaftarkan
- [ ] Masuk ke `dashboard.html`
- [ ] Coba registrasi dengan email yang sama → harus ditolak (duplikat)

### Testing Login Staff
- [ ] Admin buat akun Koordinator
- [ ] Logout admin
- [ ] Login dengan akun Koordinator yang baru dibuat
- [ ] Masuk ke `pages/koordinator/dashboard.html`
- [ ] Ulangi untuk Tata Usaha, Sekretaris, Pendeta

### Testing CRUD Akun
- [ ] Admin edit akun staff → update email/password
- [ ] Admin coba ubah role Jemaat ke Koordinator → harus ditolak
- [ ] Admin hapus akun staff
- [ ] Admin hapus akun Jemaat → beri warning

---

## 📝 Catatan Penting

### Keamanan localStorage
1. **Password Disimpan Plain Text**: Dalam implementasi ini password disimpan tanpa hashing
2. **Production Warning**: JANGAN gunakan sistem ini di production tanpa:
   - Backend API dengan JWT/Session authentication
   - Password hashing (bcrypt/argon2)
   - HTTPS
   - CSRF protection
   - Rate limiting untuk login attempts
   - Audit logging

### Master Admin Credential
- Hardcoded di `assets/js/auth.js`
- Tidak dapat dihapus dari localStorage
- Tidak muncul di halaman Kelola Akun
- Prioritas tertinggi saat login (dicek pertama)

### Validasi
- Email harus unique (tidak boleh duplikat)
- NIK harus unique untuk Jemaat (tidak boleh duplikat)
- Role tidak dapat diubah antara Jemaat ↔ Staff
- Admin tidak dapat mendaftarkan akun Jemaat (harus self-registration)
- Jemaat tidak dapat dibuat melalui halaman admin

---

## 🔧 Troubleshooting

### Lupa Password Admin
**Solusi:** Gunakan Master Admin credential
- Email: `skyfranclyntheedens@gmail.com`
- Password: `kp2025`

### Akun Tidak Tersimpan
**Cek:**
1. Buka DevTools (F12) → Console
2. Jalankan: `JSON.parse(localStorage.getItem('users'))`
3. Pastikan array berisi data akun

### Reset Semua Akun
**Peringatan:** Ini akan menghapus SEMUA akun kecuali Master Admin
```javascript
// Jalankan di Console (F12)
localStorage.removeItem('users');
console.log('✅ Semua akun dihapus. Master Admin tetap dapat login.');
```

### Clear Session
```javascript
// Jalankan di Console (F12)
localStorage.removeItem('currentUser');
sessionStorage.clear();
console.log('✅ Session cleared. Silakan login ulang.');
```

---

## 🔐 Security Best Practices (Production)

⚠️ **JANGAN** gunakan sistem ini di production tanpa implementasi berikut:

### Backend Requirements
- [ ] RESTful API dengan proper authentication
- [ ] JWT atau Session-based auth
- [ ] Password hashing dengan bcrypt/argon2
- [ ] Email verification untuk registrasi
- [ ] Password reset via email
- [ ] Rate limiting untuk login attempts
- [ ] CORS configuration
- [ ] HTTPS only

### Frontend Requirements
- [ ] Remove hardcoded credentials dari source code
- [ ] Implement proper token management
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Input sanitization
- [ ] Secure cookie settings

### Database
- [ ] Proper user table dengan indexes
- [ ] Password hashing di database
- [ ] Audit log untuk semua perubahan akun
- [ ] Soft delete untuk akun yang dihapus
- [ ] Role-based access control (RBAC)

---

## 📞 Kontak

Jika ada masalah dengan Master Admin credential, hubungi:
**Email:** skyfranclyntheedens@gmail.com
