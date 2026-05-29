# 🐛 TEST BUG FIX - UPLOAD PDF & ALERT PENGEMBALIAN

## ✅ Bug yang Diperbaiki

### **Bug 1: File PDF tidak bisa diupload setelah JPG**
**Problem:** 
- Staff Tata Usaha upload file JPG
- Kemudian ingin ganti dengan file PDF
- PDF tidak bisa diupload / preview tidak muncul

**Root Cause:**
- Deteksi tipe file hanya mengandalkan MIME type `file.type`
- Beberapa browser tidak set MIME type dengan benar untuk PDF
- `type.includes('pdf')` gagal jika `type` kosong atau salah

**Solution:**
```javascript
// OLD (BROKEN):
const isPdf = (type.includes('pdf')) || name.toLowerCase().endsWith('.pdf');

// NEW (FIXED):
const lowerName = name.toLowerCase();
const isPdf = (type && type.includes('pdf')) || lowerName.endsWith('.pdf');
const isImage = (type && (type.includes('image/jpeg') || type.includes('image/jpg'))) || 
                lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');
const isWord = (type && (type.includes('word') || type.includes('msword') || type.includes('document'))) || 
               lowerName.endsWith('.doc') || lowerName.endsWith('.docx');
```

**Improvement:**
- ✅ Fallback ke file extension jika MIME type kosong
- ✅ Cache-busting timestamp untuk force reload preview
- ✅ Proper error handling dengan `onerror` pada image
- ✅ Added support untuk file Word (.doc, .docx)

---

### **Bug 2: Alert pengembalian tidak tampil di halaman Tata Usaha**
**Problem:**
- Sekretaris/Pendeta mengembalikan surat ke Tata Usaha
- Status berubah ke `disposisi_to_tatausaha`
- Tapi alert informasi pengembalian tidak tampil

**Root Cause:**
- Timeline entry search terlalu strict
- Filter `!entry.note.includes('berhasil diunggah')` tidak case-insensitive
- Tidak ada fallback ke `item.keterangan` atau `item.rejection_note`
- Tidak ada debug logging untuk troubleshooting

**Solution:**
```javascript
// IMPROVED SEARCH LOGIC:
if (entry && 
    entry.action === 'disposisi_to_tatausaha' && 
    (entry.by === 'sekretaris' || entry.by === 'pendeta') &&
    entry.note && 
    !entry.note.toLowerCase().includes('berhasil diunggah') &&
    !entry.note.toLowerCase().includes('file surat')) {
  returnEntry = entry;
  break;
}

// ADDED FALLBACK:
if (!returnEntry && (item.keterangan || item.rejection_note)) {
  returnEntry = {
    by: item.returned_by || 'sekretaris',
    note: item.keterangan || item.rejection_note || 'Surat perlu diperbaiki',
    at: item.returned_at || item.last_updated || new Date().toISOString()
  };
}
```

**Improvement:**
- ✅ Case-insensitive filter untuk skip upload messages
- ✅ Debug console.log untuk troubleshooting
- ✅ Fallback ke item.keterangan jika timeline kosong
- ✅ Better error handling dengan warning logs

---

## 🧪 Test Scenario

### **Test 1: Upload JPG → Ganti ke PDF**
1. Login sebagai Tata Usaha
2. Buka detail surat (status: `verified_by_koordinator`)
3. Upload file **test-image.jpg**
   - ✅ Preview muncul dengan gambar
4. Klik tombol upload lagi
5. Upload file **test-document.pdf**
   - ✅ Preview berubah ke iframe PDF
   - ✅ Tidak ada error di console
   - ✅ File tersimpan dengan benar di localStorage

### **Test 2: Sekretaris Kembalikan Surat**
1. Login sebagai Sekretaris
2. Buka "Daftar Masuk"
3. Klik tombol "Kembalikan" pada surat dari Tata Usaha
4. Isi alasan: "Terdapat kesalahan penulisan nama pemohon"
5. Konfirmasi
   - ✅ Status berubah ke `disposisi_to_tatausaha`
   - ✅ Timeline entry ditambahkan dengan:
     - `by: 'sekretaris'`
     - `action: 'disposisi_to_tatausaha'`
     - `note: 'Terdapat kesalahan penulisan nama pemohon'`

### **Test 3: Tata Usaha Lihat Alert Pengembalian**
1. Login sebagai Tata Usaha
2. Buka halaman detail surat yang dikembalikan
3. Verify:
   - ✅ Alert box merah muncul di atas halaman
   - ✅ Menampilkan "Dikembalikan oleh: **Sekretaris**"
   - ✅ Menampilkan waktu pengembalian
   - ✅ Menampilkan alasan penolakan dengan benar
   - ✅ Ada instruksi "Langkah Selanjutnya"

### **Test 4: Upload File Baru & Kirim Ulang**
1. Masih di halaman detail surat (sebagai Tata Usaha)
2. Upload file PDF yang sudah diperbaiki
   - ✅ Preview muncul dengan benar
   - ✅ Alert pengembalian masih tampil
3. Klik tombol "Kirim Disposisi ke Sekretaris"
4. Konfirmasi
   - ✅ Status berubah ke `disposisi_to_sekretaris`
   - ✅ File baru tersimpan
   - ✅ Timeline updated

---

## 🔍 Debug Console Commands

Buka browser console (F12) saat di halaman detail Tata Usaha:

```javascript
// Check current item data
console.log('Current Item:', window.currentItem);

// Check timeline entries
const item = window.currentItem;
console.log('Timeline:', item.timeline);

// Find return entries
const returns = item.timeline.filter(e => e.action === 'disposisi_to_tatausaha');
console.log('Return Entries:', returns);

// Check status
console.log('Status:', item.status);
console.log('Should show alert:', item.status === 'disposisi_to_tatausaha');
```

---

## 📋 Files Modified

### `detail-surat.js` (Tata Usaha)
**Location:** `d:\KP SI SURAT YEGAR\Frontend\assets\js\tatausaha\detail-surat.js`

**Changes:**
1. ✅ Enhanced file type detection (lines ~140-150)
2. ✅ Improved PDF rendering with force reload (lines ~150-168)
3. ✅ Added Word document handling (lines ~175-190)
4. ✅ Enhanced return entry search with debug logs (lines ~485-560)
5. ✅ Added fallback mechanism for missing timeline (lines ~535-545)

---

## ✅ Expected Results

### **Before Fix:**
- ❌ PDF upload fails after JPG
- ❌ Alert tidak muncul
- ❌ No debug info
- ❌ No Word support

### **After Fix:**
- ✅ PDF upload works perfectly
- ✅ JPG to PDF switch works
- ✅ PDF to JPG switch works
- ✅ Alert muncul dengan informasi lengkap
- ✅ Debug console logs untuk troubleshooting
- ✅ Fallback mechanism untuk edge cases
- ✅ Word document preview support
- ✅ Better error messages

---

## 🚀 Next Steps

1. **Clear localStorage** untuk test fresh:
   ```javascript
   localStorage.clear();
   ```

2. **Setup test data** dengan alur:
   - Admin buat akun Koordinator
   - Jemaat submit pengajuan
   - Koordinator verifikasi
   - Tata Usaha upload file JPG
   - Sekretaris kembalikan
   - Tata Usaha ganti ke PDF
   - Disposisi ulang

3. **Monitor console** untuk debug messages:
   - 🔍 Checking timeline
   - ✅ Found return entry
   - ⚠️ Warnings jika ada masalah

---

## 📝 Notes

- File detection sekarang robust dengan dual-check (MIME + extension)
- Timeline search sekarang lebih reliable dengan multiple fallbacks
- Debug logging memudahkan troubleshooting di production
- Error handling lebih baik dengan informative messages
