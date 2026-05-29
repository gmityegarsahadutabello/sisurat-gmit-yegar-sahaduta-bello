# Setup Google OAuth untuk Sistem Login GMIT Yegar

## 📋 Daftar Isi
1. [Persiapan Google Cloud Console](#persiapan-google-cloud-console)
2. [Konfigurasi Backend](#konfigurasi-backend)
3. [Konfigurasi Frontend](#konfigurasi-frontend)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)

---

## 🔧 Persiapan Google Cloud Console

### 1. Buat Project di Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Klik **Select a project** → **NEW PROJECT**
3. Masukkan nama project (contoh: "GMIT Yegar Auth")
4. Klik **CREATE**

### 2. Enable Google+ API

1. Di sidebar, pilih **APIs & Services** → **Library**
2. Cari "Google+ API"
3. Klik **ENABLE**

### 3. Buat OAuth 2.0 Credentials

1. Di sidebar, pilih **APIs & Services** → **Credentials**
2. Klik **CREATE CREDENTIALS** → **OAuth client ID**
3. Jika diminta, konfigurasi OAuth consent screen:
   - User Type: **External**
   - App name: `GMIT Yegar Sistem Surat`
   - User support email: email Anda
   - Developer contact: email Anda
   - Klik **SAVE AND CONTINUE**
   - Scopes: Biarkan default (email, profile)
   - Test users: Tambahkan email untuk testing
   - Klik **SAVE AND CONTINUE**

4. Kembali ke **Credentials** → **CREATE CREDENTIALS** → **OAuth client ID**
5. Application type: **Web application**
6. Name: `GMIT Yegar Web Client`
7. **Authorized JavaScript origins**:
   ```
   http://localhost:5500
   http://127.0.0.1:5500
   http://localhost:3000
   ```
   (Sesuaikan dengan port yang Anda gunakan)

8. **Authorized redirect URIs**:
   ```
   http://localhost:5500
   http://127.0.0.1:5500
   http://localhost:3000
   ```

9. Klik **CREATE**
10. **PENTING**: Copy **Client ID** yang muncul (format: `xxxxx.apps.googleusercontent.com`)

---

## ⚙️ Konfigurasi Backend

### 1. Setup Environment Variables

Edit file `.env` di folder `Backend/`:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/gmit-yegar

# Server Port
PORT=5000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=PASTE_CLIENT_ID_ANDA_DISINI.apps.googleusercontent.com
```

**Contoh:**
```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

### 2. Restart Backend Server

```powershell
cd Backend
npm run dev
```

Pastikan server running tanpa error.

---

## 🎨 Konfigurasi Frontend

### 1. Update Google Client ID

Edit file `Frontend/assets/js/google-auth.js`, ubah baris 3-5:

```javascript
const GOOGLE_CONFIG = {
  CLIENT_ID: 'PASTE_CLIENT_ID_ANDA_DISINI.apps.googleusercontent.com',
};
```

**Contoh:**
```javascript
const GOOGLE_CONFIG = {
  CLIENT_ID: '123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
};
```

### 2. Jalankan Frontend

Gunakan Live Server atau server HTTP lainnya:

```powershell
# Jika menggunakan Live Server extension di VS Code
# Klik kanan index.html → Open with Live Server

# Atau gunakan http-server
npx http-server Frontend -p 5500
```

---

## 🧪 Testing

### Test Case 1: Login dengan Akun Google yang Sudah Terdaftar

1. Buka halaman login (`http://localhost:5500/index.html`)
2. Klik tombol **"Sign in with Google"**
3. Pilih akun Google
4. **Expected Result**: User langsung masuk ke dashboard

### Test Case 2: Login dengan Akun Google Baru (Belum Terdaftar)

1. Buka halaman login
2. Klik tombol **"Sign in with Google"**
3. Pilih akun Google yang belum pernah terdaftar
4. **Expected Result**: Diarahkan ke halaman registrasi dengan:
   - Email sudah terisi dan readonly
   - Nama sudah terisi (dari Google)
   - Badge "Email terverifikasi oleh Google" muncul
   - Field password tersembunyi
5. Lengkapi data NIK dan Rayon
6. Klik **"Daftar Sekarang"**
7. **Expected Result**: Registrasi berhasil, redirect ke halaman login

### Test Case 3: Registrasi Langsung dari Halaman Register

1. Buka halaman register (`http://localhost:5500/register.html`)
2. Klik tombol **"Sign up with Google"**
3. Pilih akun Google
4. Lanjutkan seperti Test Case 2

### Test Case 4: Registrasi Manual (Tanpa Google)

1. Buka halaman register
2. Isi semua field secara manual
3. Klik **"Daftar Sekarang"**
4. **Expected Result**: Registrasi berhasil dengan flow normal

---

## 🔍 Troubleshooting

### Error: "Google API not loaded"

**Penyebab**: Script Google Sign-In tidak ter-load

**Solusi**:
1. Pastikan internet connection stabil
2. Cek browser console untuk error
3. Clear browser cache dan refresh
4. Pastikan tidak ada ad-blocker yang memblokir Google scripts

### Error: "Token used too late" atau Token Expired

**Penyebab**: Token Google sudah kadaluarsa

**Solusi**:
- Refresh halaman dan coba login lagi
- Token Google hanya valid beberapa menit

### Error: "Invalid Client ID"

**Penyebab**: Client ID tidak valid atau tidak match

**Solusi**:
1. Cek `GOOGLE_CLIENT_ID` di file `.env` (backend)
2. Cek `CLIENT_ID` di file `google-auth.js` (frontend)
3. Pastikan keduanya sama persis dengan Client ID dari Google Cloud Console
4. Pastikan tidak ada spasi di awal/akhir Client ID

### Error: "Redirect URI Mismatch"

**Penyebab**: URL yang digunakan tidak terdaftar di Google Cloud Console

**Solusi**:
1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Pilih project → **Credentials**
3. Klik OAuth Client ID yang digunakan
4. Tambahkan URL yang Anda gunakan di **Authorized JavaScript origins** dan **Authorized redirect URIs**
5. Contoh: `http://localhost:5500`, `http://127.0.0.1:5500`

### Error: "Email atau NIK sudah terdaftar" saat Registrasi Google

**Penyebab**: Email atau NIK sudah ada di database

**Solusi**:
- Jika email sudah terdaftar tapi belum pakai Google, user harus login manual dulu
- Jika NIK yang sama, gunakan NIK yang berbeda
- Untuk development: hapus user dari database dan coba lagi

### Google Sign-In Button Tidak Muncul

**Penyebab**: 
- Script tidak ter-load
- Client ID belum dikonfigurasi
- JavaScript error

**Solusi**:
1. Buka browser console (F12)
2. Cek error messages
3. Pastikan `google-auth.js` ter-load
4. Pastikan Client ID sudah dikonfigurasi
5. Cek Network tab untuk request ke Google APIs

---

## 🔐 Security Notes

### Password untuk Akun Google

User yang daftar via Google akan mendapat password random yang di-hash. User **TIDAK BISA** login manual dengan password ini. User harus selalu login via Google.

### Email Verification

Email yang berasal dari Google sudah terverifikasi oleh Google, sehingga tidak perlu verifikasi email tambahan.

### Data yang Disimpan

Dari Google, sistem menyimpan:
- Email (verified)
- Nama lengkap
- Google ID (untuk reference)

Data tambahan dari user:
- NIK
- Rayon

---

## 📊 Flow Diagram

### Login Flow

```
User klik "Sign in with Google"
         ↓
Google OAuth Popup
         ↓
User pilih akun & authorize
         ↓
Frontend dapat credential token
         ↓
Kirim token ke: POST /api/auth/google
         ↓
Backend verify token dengan Google
         ↓
    ┌─────────────┐
    │ Cek Database│
    └─────────────┘
         ↓
    User exists?
    /          \
  YES           NO
   ↓             ↓
Return user   Return action:
  data         'register'
   ↓             ↓
Login ke     Redirect ke
dashboard    register page
```

### Register Flow (via Google)

```
User di register page
         ↓
Data Google tersimpan di sessionStorage
         ↓
Form pre-filled dengan:
- Email (readonly)
- Nama
         ↓
User lengkapi:
- NIK
- Rayon
         ↓
Submit form
         ↓
POST /api/auth/google/register
         ↓
User created dengan:
- Data Google (email, name, googleId)
- Data tambahan (nik, rayon)
- Random password
         ↓
Redirect ke login page
         ↓
User login via Google
```

---

## 🎯 Keuntungan Menggunakan Google OAuth

1. ✅ **Email Terverifikasi**: Tidak perlu sistem verifikasi email sendiri
2. ✅ **User Experience**: Login lebih cepat dan mudah
3. ✅ **Security**: Password di-manage oleh Google (lebih aman)
4. ✅ **Trusted**: User lebih percaya dengan Google Sign-In
5. ✅ **Less Maintenance**: Tidak perlu handle forgot password untuk akun Google

---

## 📝 Catatan Penting

### Untuk Production

Saat deploy ke production:

1. Update **Authorized JavaScript origins** di Google Cloud Console dengan domain production:
   ```
   https://yourdomain.com
   ```

2. Update **Authorized redirect URIs** dengan URL production

3. Update `CLIENT_ID` di frontend dengan environment-specific config

4. Pastikan `.env` di server production sudah berisi `GOOGLE_CLIENT_ID` yang benar

5. **JANGAN** commit file `.env` ke Git!

### Untuk Development

- Gunakan test users yang sudah ditambahkan di OAuth consent screen
- Bisa menggunakan multiple Google accounts untuk testing
- Client ID sama untuk semua developer (share via secure channel)

---

## 🆘 Kontak Support

Jika mengalami masalah:

1. Cek [Google OAuth Documentation](https://developers.google.com/identity/gsi/web)
2. Cek browser console untuk error messages
3. Cek backend logs untuk error details
4. Review file `TROUBLESHOOTING.md` (jika ada)

---

**Last Updated**: December 15, 2025
**Version**: 1.0.0
