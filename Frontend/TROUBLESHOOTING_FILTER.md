# 🚨 TROUBLESHOOTING: FILTER PENGAJUAN JEMAAT

## ❌ Masalah yang Dilaporkan

**Problem:** Ketika login dengan akun jemaat berbeda, semua pengajuan dari semua jemaat tetap muncul.

**Expected:** Setiap jemaat hanya melihat pengajuan surat mereka sendiri.

**Actual:** Semua jemaat melihat semua pengajuan (PRIVACY BREACH!)

---

## 🔍 Root Cause Analysis

### **Kemungkinan Penyebab:**

1. **Data Lama Tidak Punya user_id**
   - Pengajuan dibuat sebelum fix diimplementasikan
   - Tidak ada field `user_id`, `user_email`, `user_nama`, `user_nik`
   - Filter tidak bisa mencocokkan dengan currentUser

2. **CurrentUser Tidak Ada**
   - User belum login dengan benar
   - Session expired
   - localStorage corrupted

3. **Filter Tidak Jalan**
   - JavaScript error
   - File `daftar-pengajuan.js` tidak ter-load
   - Fungsi getCurrentUser() return null

---

## 🧪 Cara Debugging

### **Step 1: Buka Debugging Tool**

1. Buka file: `check-filter-pengajuan.html` di browser
2. Tool ini akan membantu debugging dengan visual interface

**Atau manual via Browser Console:**

Buka Browser Console (F12), jalankan:

```javascript
// 1. Cek Current User
const user = JSON.parse(localStorage.getItem('currentUser'));
console.log('Current User:', user);
console.log('User ID:', user?.id);
console.log('User Email:', user?.email);

// 2. Cek Semua Pengajuan
const pengajuan = JSON.parse(localStorage.getItem('local_pengajuan'));
console.log('Total Pengajuan:', pengajuan?.length);

// 3. Cek pengajuan dengan/tanpa user_id
const withUserId = pengajuan?.filter(p => p.user_id)?.length || 0;
const withoutUserId = pengajuan?.filter(p => !p.user_id)?.length || 0;

console.log('Dengan user_id:', withUserId);
console.log('TANPA user_id:', withoutUserId);

// 4. Test filter
if (user && pengajuan) {
  const filtered = pengajuan.filter(p => 
    p.user_id === user.id || 
    p.user_email === user.email ||
    p.email === user.email
  );
  console.log('Hasil Filter:', filtered.length);
  console.table(filtered);
}
```

### **Step 2: Identifikasi Masalah**

**Scenario A: withoutUserId > 0**
```
❌ MASALAH: Ada pengajuan tanpa user_id
✅ SOLUSI: Jalankan Fix Old Data atau Hapus Data Lama
```

**Scenario B: user === null**
```
❌ MASALAH: Tidak ada currentUser
✅ SOLUSI: Login ulang dengan akun jemaat
```

**Scenario C: filtered.length === pengajuan.length**
```
❌ MASALAH: Filter tidak bekerja
✅ SOLUSI: Cek console untuk JavaScript error
```

---

## 🔧 Solusi yang Tersedia

### **Solusi 1: Fix Old Data (RECOMMENDED)**

Cocokkan pengajuan lama dengan user berdasarkan email/NIK:

```javascript
// Via Browser Console
const pengajuan = JSON.parse(localStorage.getItem('local_pengajuan'));
const users = JSON.parse(localStorage.getItem('users'));

let fixed = 0;
pengajuan.forEach(p => {
  if (!p.user_id) {
    const user = users.find(u => 
      u.email === p.email || 
      u.email === p.pemohon_email ||
      u.nik === p.pemohon_nik
    );
    
    if (user) {
      p.user_id = user.id;
      p.user_email = user.email;
      p.user_nama = user.nama;
      p.user_nik = user.nik;
      fixed++;
    }
  }
});

if (fixed > 0) {
  localStorage.setItem('local_pengajuan', JSON.stringify(pengajuan));
  console.log(`✅ Fixed ${fixed} pengajuan`);
} else {
  console.log('ℹ️ Tidak ada yang perlu diperbaiki');
}
```

**Atau via Tool:**
1. Buka `check-filter-pengajuan.html`
2. Klik "4. Fix Data Lama"

---

### **Solusi 2: Hapus Data Lama**

⚠️ **WARNING: Data yang dihapus TIDAK BISA dikembalikan!**

```javascript
// Via Browser Console
const pengajuan = JSON.parse(localStorage.getItem('local_pengajuan'));
const cleaned = pengajuan.filter(p => p.user_id || p.user_email || p.email);

localStorage.setItem('local_pengajuan', JSON.stringify(cleaned));
console.log(`✅ Deleted ${pengajuan.length - cleaned.length} pengajuan tanpa user_id`);
```

**Atau via Tool:**
1. Buka `check-filter-pengajuan.html`
2. Klik "⚠️ Hapus Data Tanpa user_id"

---

### **Solusi 3: Reset Semua Data**

⚠️ **NUCLEAR OPTION: Hapus SEMUA data dan mulai fresh**

```javascript
// Hapus semua pengajuan
localStorage.removeItem('local_pengajuan');
console.log('✅ Semua pengajuan dihapus');

// Atau hapus semua localStorage
localStorage.clear();
sessionStorage.clear();
console.log('✅ Semua data dihapus - sistem fresh');
```

---

## 📊 Verifikasi Fix Berhasil

### **Test 1: Login sebagai Jemaat A**

1. Logout dari akun sekarang
2. Login sebagai Jemaat A (contoh: jemaat1@example.com)
3. Buka halaman "Daftar Pengajuan"
4. **Expected:** Hanya muncul pengajuan milik Jemaat A

### **Test 2: Login sebagai Jemaat B**

1. Logout
2. Login sebagai Jemaat B (contoh: jemaat2@example.com)
3. Buka halaman "Daftar Pengajuan"
4. **Expected:** Hanya muncul pengajuan milik Jemaat B

### **Test 3: Buat Pengajuan Baru**

1. Login sebagai Jemaat C
2. Buat pengajuan baru (Surat Baptis)
3. Logout → Login sebagai Jemaat A
4. **Expected:** Surat Baptis milik Jemaat C TIDAK muncul
5. Logout → Login sebagai Jemaat C
6. **Expected:** Surat Baptis muncul

### **Test 4: Console Verification**

Buka Console (F12) di halaman Daftar Pengajuan:

```javascript
// Harus muncul log seperti ini:
🔍 DEBUG - Current User: { id: "jemaat_xxx", email: "xxx@example.com", ... }
🔍 DEBUG - Total pengajuan before filter: 10
✅ DEBUG - Pengajuan after filter: 3
📋 DEBUG - Filtered items: [...]
```

**Jika muncul:**
```javascript
⚠️ WARNING - No currentUser found! Showing all pengajuan (SECURITY ISSUE!)
```

→ Artinya ada masalah dengan login. Logout dan login ulang.

---

## 🛠️ Implementasi Technical Details

### **File yang Mengatur Filter:**

#### **1. `assets/js/pengajuan.js` (Lines ~373-383)**

Saat pengajuan dibuat, otomatis simpan user identity:

```javascript
const fallback = {
  id: LS.genId('pengajuan'),
  type,
  status: 'proses',
  
  // USER IDENTITY - untuk filter
  user_id: fallbackUser.id || null,
  user_email: fallbackUser.email || null,
  user_nama: fallbackUser.nama || null,
  user_nik: fallbackUser.nik || null,
  
  // ... fields lain
};
```

#### **2. `assets/js/daftar-pengajuan.js` (Lines ~139-167)**

Saat load pengajuan, filter berdasarkan currentUser:

```javascript
const currentUser = getCurrentUser();
if (currentUser) {
  items = items.filter(item => {
    return item.user_id === currentUser.id || 
           item.user_email === currentUser.email ||
           item.email === currentUser.email;
  });
}
```

**Debug Version (NEW):**
Sekarang ada console.log untuk tracking:

```javascript
console.log('🔍 DEBUG - Current User:', currentUser);
console.log('🔍 DEBUG - Total pengajuan before filter:', items.length);
// Filter...
console.log('✅ DEBUG - Pengajuan after filter:', items.length);
```

---

## 📁 Tools yang Tersedia

### **1. check-filter-pengajuan.html**

Interactive debugging tool dengan features:
- ✅ Check Current User
- ✅ Check All Pengajuan
- ✅ Test Filter
- ✅ Fix Old Data (auto-match by email/NIK)
- ✅ Delete Old Data (permanent)
- ✅ Export Data (backup)

**Cara Pakai:**
1. Buka `check-filter-pengajuan.html` di browser
2. Klik tombol sesuai kebutuhan
3. Lihat hasil di Console Log

### **2. migration-tool.html**

Tool untuk migrasi data dari sistem lama:
- ✅ Check Data
- ✅ Migrate Data
- ✅ Clear Pengajuan

**Cara Pakai:**
1. Buka `migration-tool.html`
2. Klik "1. Cek Data" untuk lihat status
3. Klik "2. Migrate Data" untuk fix

---

## 🔒 Security Implications

### **Before Fix:**
```
❌ Jemaat A bisa lihat pengajuan Jemaat B, C, D, dst
❌ Data pribadi (NIK, alamat, nama) exposed ke semua user
❌ PRIVACY BREACH - CRITICAL SECURITY ISSUE
```

### **After Fix:**
```
✅ Jemaat A hanya lihat pengajuan milik Jemaat A
✅ Data pribadi terlindungi
✅ Isolation per user account
```

---

## 📋 Checklist Troubleshooting

### **Jika Filter Tidak Bekerja:**

- [ ] Buka Browser Console (F12)
- [ ] Cek apakah ada JavaScript error (warna merah)
- [ ] Cek log debug (`🔍 DEBUG - Current User:`)
- [ ] Verify currentUser tidak null
- [ ] Verify pengajuan memiliki user_id
- [ ] Test filter manual via console
- [ ] Gunakan `check-filter-pengajuan.html` tool
- [ ] Fix atau hapus data lama tanpa user_id
- [ ] Logout dan login ulang
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Test dengan akun jemaat berbeda

### **Jika Masih Bermasalah:**

- [ ] Export data via tool (backup)
- [ ] Reset localStorage (NUCLEAR)
- [ ] Login ulang sebagai admin
- [ ] Buat akun jemaat baru
- [ ] Buat pengajuan test
- [ ] Verify filter bekerja untuk data baru

---

## 🚀 Next Steps

1. **IMMEDIATE:** Gunakan `check-filter-pengajuan.html` untuk diagnosis
2. **FIX DATA:** Jalankan "Fix Old Data" untuk auto-match
3. **TEST:** Verify dengan login 2 akun jemaat berbeda
4. **MONITOR:** Cek console log saat buka daftar pengajuan
5. **CONFIRM:** Pastikan privacy terjaga

---

## 📞 Support Commands

### **Quick Check (Copy-Paste ke Console):**

```javascript
// All-in-one check
(function(){
  const u = JSON.parse(localStorage.getItem('currentUser'));
  const p = JSON.parse(localStorage.getItem('local_pengajuan'));
  const f = p?.filter(x => x.user_id === u?.id || x.user_email === u?.email || x.email === u?.email) || [];
  
  console.log('========================================');
  console.log('🔍 QUICK CHECK FILTER PENGAJUAN');
  console.log('========================================');
  console.log('Current User:', u?.nama || 'NOT LOGGED IN');
  console.log('Total Pengajuan:', p?.length || 0);
  console.log('Dengan user_id:', p?.filter(x => x.user_id)?.length || 0);
  console.log('TANPA user_id:', p?.filter(x => !x.user_id)?.length || 0);
  console.log('Pengajuan User Ini:', f.length);
  console.log('========================================');
  
  if (!u) {
    console.error('❌ ERROR: Tidak ada currentUser - Login dulu!');
  } else if (p?.filter(x => !x.user_id)?.length > 0) {
    console.warn('⚠️ WARNING: Ada pengajuan tanpa user_id - Perlu diperbaiki!');
    console.log('Gunakan: check-filter-pengajuan.html > Fix Old Data');
  } else if (f.length === 0) {
    console.log('ℹ️ User ini belum punya pengajuan');
  } else {
    console.log('✅ Filter bekerja normal');
  }
})();
```

---

**STATUS:** 🔧 **TROUBLESHOOTING GUIDE READY**

Gunakan tools dan panduan di atas untuk debugging dan fixing masalah filter pengajuan!
