# SETUP SISTEM - FRESH INSTALLATION

## 🚀 Quick Start

### 1. Clear Dummy Data (WAJIB untuk Fresh Install)

Buka **Browser Console** (F12) dan jalankan:

```javascript
// HAPUS SEMUA DATA DUMMY
localStorage.clear();
sessionStorage.clear();
console.log('✅ Semua data dummy telah dihapus!');
console.log('📋 Sistem siap untuk digunakan.');
```

### 2. Login sebagai Master Admin

```
URL: index.html
Email: skyfranclyntheedens@gmail.com
Password: kp2025
```

### 3. Buat Akun Staff Pertama

Setelah login sebagai admin:
1. Buka menu "Kelola Akun"
2. Klik "Tambah Akun"
3. Buat akun Koordinator, Tata Usaha, Sekretaris, Pendeta sesuai kebutuhan

### 4. Test Registrasi Jemaat

1. Logout dari admin
2. Buka `register.html`
3. Registrasi akun jemaat baru
4. Login dengan akun jemaat yang baru dibuat

---

## 📋 Checklist Setup Awal

### Admin Setup
- [ ] Clear localStorage dan sessionStorage
- [ ] Login dengan Master Admin (`skyfranclyntheedens@gmail.com` / `kp2025`)
- [ ] Masuk ke dashboard admin
- [ ] Akses menu "Kelola Akun"

### Buat Staff Accounts
- [ ] Buat akun **Koordinator Rayon 1** (minimal 1)
- [ ] Buat akun **Koordinator Rayon 2** (jika ada)
- [ ] Buat akun **Tata Usaha** (1 akun)
- [ ] Buat akun **Sekretaris** (1 akun)
- [ ] Buat akun **Pendeta** (1 akun)

### Test Jemaat Registration
- [ ] Logout dari admin
- [ ] Buka halaman registrasi
- [ ] Daftar sebagai **Jemaat Rayon 1**
- [ ] Login dengan akun jemaat baru
- [ ] Cek apakah masuk ke dashboard jemaat

### Test Complete Workflow
- [ ] Jemaat: Ajukan surat
- [ ] Koordinator: Verifikasi surat
- [ ] Tata Usaha: Upload surat & disposisi ke Sekretaris
- [ ] Sekretaris: Review & disposisi ke Pendeta
- [ ] Pendeta: Validasi final
- [ ] Jemaat: Terima notifikasi & download surat

---

## 🔧 Script Helper

### Check Current Users
```javascript
// Lihat semua akun yang terdaftar
const users = JSON.parse(localStorage.getItem('users') || '[]');
console.table(users.map(u => ({
  email: u.email,
  role: u.role,
  rayon: u.rayon || '-',
  created: u.created_at
})));
console.log('Total users:', users.length);
```

### Check Current Session
```javascript
// Lihat user yang sedang login
const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
if (currentUser) {
  console.log('Logged in as:', currentUser.nama, '(' + currentUser.role + ')');
} else {
  console.log('No active session');
}
```

### Delete Specific User
```javascript
// Hapus user berdasarkan email
const emailToDelete = 'user@example.com'; // Ganti dengan email yang ingin dihapus
let users = JSON.parse(localStorage.getItem('users') || '[]');
users = users.filter(u => u.email !== emailToDelete);
localStorage.setItem('users', JSON.stringify(users));
console.log('✅ User deleted:', emailToDelete);
```

### Export All Data
```javascript
// Export semua data untuk backup
const backup = {
  users: JSON.parse(localStorage.getItem('users') || '[]'),
  pengajuan: JSON.parse(localStorage.getItem('local_pengajuan') || '[]'),
  notifications: JSON.parse(localStorage.getItem('local_notifications') || '[]'),
  timestamp: new Date().toISOString()
};
console.log('BACKUP DATA:');
console.log(JSON.stringify(backup, null, 2));
// Copy output dan simpan ke file .json
```

### Import Data from Backup
```javascript
// Import data dari backup (paste object backup di bawah)
const backup = {
  // Paste backup object di sini
};

if (backup.users) localStorage.setItem('users', JSON.stringify(backup.users));
if (backup.pengajuan) localStorage.setItem('local_pengajuan', JSON.stringify(backup.pengajuan));
if (backup.notifications) localStorage.setItem('local_notifications', JSON.stringify(backup.notifications));

console.log('✅ Data restored from backup');
```

---

## 🎯 Skenario Penggunaan

### Scenario 1: Setup Gereja Baru
```
1. Admin login → Buat 1 Koordinator per rayon
2. Admin → Buat Tata Usaha, Sekretaris, Pendeta
3. Jemaat registrasi mandiri via register.html
4. Ready to use!
```

### Scenario 2: Migrasi dari Sistem Lama
```
1. Export data dari sistem lama (jika ada)
2. Clear localStorage
3. Admin login → Input semua staff secara manual
4. Jemaat diminta registrasi ulang
5. Import pengajuan surat (jika perlu)
```

### Scenario 3: Testing & Development
```
1. Clear localStorage
2. Login sebagai Master Admin
3. Buat akun test untuk setiap role
4. Test workflow lengkap
5. Clear localStorage lagi jika perlu reset
```

---

## ⚠️ PENTING

### Master Admin Credential
- **TIDAK BOLEH** diubah/dihapus
- **HARDCODED** di source code (`assets/js/auth.js`)
- Gunakan hanya untuk emergency access
- Buat admin biasa untuk penggunaan sehari-hari

### Data Persistence
- Semua data di `localStorage` akan **HILANG** jika:
  - Clear browser data/cache
  - Menggunakan incognito/private mode
  - Pindah browser/device
- **Backup rutin** data penting dengan script Export di atas

### Security Warning
- Password disimpan **PLAIN TEXT** di localStorage
- **JANGAN** gunakan password penting/real
- Sistem ini **HANYA untuk development/demo**
- Production **WAJIB** menggunakan backend dengan password hashing

---

## 🐛 Troubleshooting

### "Akun tidak ditemukan" saat login
**Solusi:**
1. Cek localStorage: `console.log(localStorage.getItem('users'))`
2. Pastikan akun sudah terdaftar
3. Pastikan email/password benar
4. Gunakan Master Admin jika lupa password

### Registrasi jemaat gagal "Email sudah terdaftar"
**Solusi:**
1. Gunakan email lain
2. Atau hapus akun lama dengan script Delete Specific User

### Dashboard tidak sesuai role
**Solusi:**
1. Logout
2. Clear session: `localStorage.removeItem('currentUser')`
3. Login ulang

### Data hilang setelah refresh
**Kemungkinan:**
- Browser private/incognito mode → tidak persistent
- localStorage disabled di browser
- Script error yang menghapus data

**Solusi:**
- Gunakan normal browsing mode
- Check browser localStorage settings
- Backup data secara rutin

---

## 📞 Support

Jika mengalami masalah teknis:
1. Check browser console (F12) untuk error
2. Verify localStorage dengan script Check Current Users
3. Reset sistem dengan Clear Dummy Data script
4. Gunakan Master Admin untuk emergency access

**Contact:** skyfranclyntheedens@gmail.com
