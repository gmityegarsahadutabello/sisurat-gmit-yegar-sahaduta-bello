# 🚀 Quick Start - Google OAuth Setup

## Langkah Cepat Setup (5 Menit)

### 1️⃣ Setup Google Cloud Console

1. Buka https://console.cloud.google.com/
2. Buat project baru: **"GMIT Yegar Auth"**
3. Enable **Google+ API**
4. Buat **OAuth Client ID** (Web application)
5. Tambahkan Authorized origins:
   - `http://localhost:5500`
   - `http://127.0.0.1:5500`
6. **Copy Client ID** (format: `xxxxx.apps.googleusercontent.com`)

### 2️⃣ Konfigurasi Backend

Edit `Backend/.env`:
```env
GOOGLE_CLIENT_ID=PASTE_CLIENT_ID_DISINI
```

Restart backend:
```powershell
cd Backend
npm run dev
```

### 3️⃣ Konfigurasi Frontend

Edit `Frontend/assets/js/google-auth.js` baris 26:
```javascript
CLIENT_ID: 'PASTE_CLIENT_ID_DISINI',
```

### 4️⃣ Jalankan Aplikasi

```powershell
# Frontend (Live Server)
# Klik kanan index.html → Open with Live Server
```

### 5️⃣ Testing

1. Buka `http://localhost:5500/index.html`
2. Klik **"Sign in with Google"**
3. Pilih akun Google
4. ✅ Done!

---

## 📌 Yang Berubah

### Login Page (`index.html`)
- ➕ Tombol "Sign in with Google"
- ✅ Cek user exists → dashboard
- ✅ User baru → register page

### Register Page (`register.html`)
- ➕ Tombol "Sign up with Google"
- ✅ Email pre-filled & verified
- ✅ Password tidak perlu diisi

---

## ❓ Troubleshooting Cepat

### Button Google Tidak Muncul
- Cek internet connection
- Cek Client ID sudah diisi
- Cek browser console (F12)

### "Invalid Client ID"
- Cek Client ID di backend (.env)
- Cek Client ID di frontend (google-auth.js)
- Pastikan sama persis

### "Redirect URI Mismatch"
- Tambahkan URL ke Google Cloud Console
- Format: `http://localhost:5500`

---

## 📖 Dokumentasi Lengkap

Lihat: [SETUP_GOOGLE_OAUTH.md](SETUP_GOOGLE_OAUTH.md)

---

**Selamat mencoba! 🎉**
