# 🐛 Troubleshooting: Data Akun Tidak Muncul

## Masalah
Data akun user tidak muncul pada menu "Kelola Akun Pengguna" pada role admin.

## Kemungkinan Penyebab & Solusi

### 1. ✅ Field ID Tidak Konsisten (FIXED)
**Masalah:** Perubahan dari `account-nama` ke `account-name` menyebabkan error saat mengakses field.

**Solusi:** 
- Tambahkan null check pada semua akses field
- Update fungsi `saveAccount()` untuk check field existence
- Update fungsi `openEditModal()` untuk set required field dengan aman

**Kode Fixed:**
```javascript
// Before (ERROR)
const nama = qs('account-name').value.trim(); // Bisa null error

// After (FIXED)
const nameField = qs('account-name');
if (!nameField) {
  alert('Form tidak lengkap. Silakan refresh halaman.');
  return;
}
const nama = nameField.value.trim();
```

### 2. ⚠️ Modal Belum Ter-load
**Masalah:** Modal di-load secara dinamis. Jika ada error saat load, form tidak akan berfungsi.

**Cara Check:**
1. Buka browser DevTools (F12)
2. Lihat tab Console
3. Cari error seperti: `Failed to load accountForm modal`

**Solusi:**
- Pastikan file modal ada:
  - `Frontend/assets/components/account-form-modal.html`
  - `Frontend/assets/components/account-delete-modal.html`
  - `Frontend/assets/components/account-reset-modal.html`
  - `Frontend/assets/components/account-reset-result-modal.html`

### 3. 🌐 Backend Tidak Running
**Masalah:** API tidak bisa diakses karena server backend mati.

**Cara Check:**
```powershell
# Di terminal, masuk ke folder Backend
cd "E:\KP SI SURAT YEGAR\Backend"

# Jalankan server
node server.js
```

**Expected Output:**
```
MongoDB Connected
Server running on port 5000
```

### 4. 🔌 CORS Error
**Masalah:** Browser block request karena CORS policy.

**Cara Check:**
Di Console, lihat error seperti:
```
Access to fetch at 'http://localhost:5000/api/users' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

**Solusi:**
Sudah ada di `Backend/server.js`:
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
```

### 5. 📊 Database Kosong
**Masalah:** Tidak ada data user di database.

**Cara Check:**
Gunakan test file: `Frontend/test-accounts-api.html`

**Test Steps:**
1. Buka browser: `file:///E:/KP%20SI%20SURAT%20YEGAR/Frontend/test-accounts-api.html`
2. Klik "Test: Get All Users"
3. Lihat hasilnya:
   - ✅ Success: Ada data users
   - ❌ Error: Ada masalah API atau database kosong

### 6. 🔐 Authentication Issue
**Masalah:** User belum login atau session expired.

**Cara Check:**
```javascript
// Di Console browser
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('Current user:', user);
```

**Solusi:**
- Logout dan login kembali sebagai admin
- Clear localStorage dan login ulang

### 7. 🎯 JavaScript Error
**Masalah:** Ada error di `accounts.js` yang menghentikan execution.

**Cara Check:**
1. Buka DevTools Console (F12)
2. Reload page
3. Lihat error messages

**Common Errors:**
```javascript
// Error 1: Cannot read property 'value' of null
// Fix: Tambah null check sebelum akses property

// Error 2: accountModal is not defined
// Fix: Check if accountModal exists before calling methods

// Error 3: API.users.getAll is not a function
// Fix: Ensure api.js is loaded before accounts.js
```

## 🧪 Testing Checklist

### Test 1: API Connection
- [ ] Backend server running
- [ ] Port 5000 tidak digunakan aplikasi lain
- [ ] MongoDB connection success

### Test 2: Frontend Load
- [ ] File `accounts.html` loaded successfully
- [ ] No 404 errors di Network tab
- [ ] All CSS/JS files loaded

### Test 3: JavaScript Execution
- [ ] No errors di Console
- [ ] `API` object exists
- [ ] `API.users.getAll()` returns data

### Test 4: Data Display
- [ ] Table shows loading spinner initially
- [ ] Data appears after loading
- [ ] Statistics cards show correct counts

### Test 5: Modal Functionality
- [ ] Click "Tambah Akun" → Modal muncul
- [ ] Modal memiliki semua form fields
- [ ] Submit button berfungsi

## 🔧 Quick Fix Commands

### Restart Backend
```powershell
cd "E:\KP SI SURAT YEGAR\Backend"
node server.js
```

### Check Backend Logs
Lihat output terminal untuk:
```
✅ MongoDB Connected
✅ Server running on port 5000
❌ Error: EADDRINUSE (port already in use)
❌ MongoDB connection error
```

### Clear Browser Cache
```javascript
// Di Console browser
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Reset Database (If Needed)
```powershell
cd "E:\KP SI SURAT YEGAR\Backend"
node seeder.js  # Re-seed database dengan data sample
```

## 📝 Files Modified (Bug Fixes)

### Frontend/assets/js/admin/accounts.js
**Changes:**
1. Added null checks in `saveAccount()`:
   ```javascript
   const nameField = qs('account-name');
   if (!nameField) {
     alert('Form tidak lengkap. Silakan refresh halaman.');
     return;
   }
   ```

2. Fixed `openEditModal()` password field:
   ```javascript
   if (passwordField) {
     passwordField.value = '';
     passwordField.required = false;
   }
   ```

3. Safe modal hide:
   ```javascript
   if (accountModal) accountModal.hide();
   if (accountModal) accountModal.show();
   ```

## 🎯 Expected Behavior

### On Page Load:
1. Loading spinner appears in table
2. API call to fetch all users
3. Table populates with user data
4. Statistics cards animate with counts

### On Click "Tambah Akun":
1. Modal HTML loaded (if not already)
2. Modal form appears with empty fields
3. All fields editable
4. Submit button ready

### On Click "Edit":
1. Modal loaded with user data
2. Form fields populated
3. Password field empty (not required)
4. Jemaat role & NIK locked (if applicable)

## 🚨 Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot read property 'value' of null` | Field not found in DOM | Add null check before access |
| `accountModal is not defined` | Modal not initialized | Check if modal loaded before use |
| `Failed to load modal` | Modal file not found | Check file path and existence |
| `API.users.getAll is not a function` | api.js not loaded | Check script load order in HTML |
| `Network Error` | Backend not running | Start backend server |
| `CORS Error` | Cross-origin issue | Check CORS config in server.js |

## ✅ Verification Steps

After fixes, verify:

1. **Page Load:**
   ```
   ✓ No errors in Console
   ✓ Table shows data
   ✓ Statistics correct
   ```

2. **Add Account:**
   ```
   ✓ Modal opens
   ✓ Form complete
   ✓ Save works
   ✓ Table refreshes
   ```

3. **Edit Account:**
   ```
   ✓ Modal opens with data
   ✓ Update works
   ✓ Table refreshes
   ```

4. **Delete Account:**
   ```
   ✓ Confirmation modal shows
   ✓ User info displayed
   ✓ Delete works
   ✓ Table refreshes
   ```

5. **Reset Password:**
   ```
   ✓ Reset modal shows
   ✓ Temp password generated
   ✓ Result modal displays password
   ✓ Copy button works
   ```

## 📞 Support

Jika masalah masih terjadi setelah mengikuti panduan ini:

1. Cek file: `Frontend/test-accounts-api.html`
2. Screenshot Console errors
3. Check Backend terminal logs
4. Verify MongoDB connection

---

**Last Updated:** December 17, 2025
**Status:** ✅ Bugs Fixed
