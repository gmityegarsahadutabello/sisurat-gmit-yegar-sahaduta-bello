# Troubleshooting: Daftar Surat Masuk Sekretaris Tidak Muncul

## Status Pengecekan

### ✅ Yang Sudah Benar:
1. Data ada di MongoDB (1 surat dengan status `disposisi_to_sekretaris`)
2. File ada di database (1.4MB PDF di `files.final.data`)
3. Backend query mengembalikan data dengan benar
4. Frontend code sudah diupdate untuk:
   - Tidak filter keluar items tanpa file
   - Menampilkan badge merah untuk items tanpa file
   - Disable tombol "Teruskan" jika file tidak ada

### 🔧 Perbaikan yang Baru Saja Dilakukan:
- **Backend Model** (`Backend/models/Pengajuan.js`):
  - Ubah prioritas `final_file` dari `f.url || f.data` menjadi `f.data || f.url`
  - Alasan: Data kita tersimpan di `files.final.data`, bukan `files.final.url`

## Langkah Testing

### 1. Restart Backend Server
**PENTING:** Backend HARUS direstart setelah perubahan model!

```bash
# Stop backend yang sedang running (Ctrl+C)
# Kemudian start ulang:
cd Backend
node server.js
```

### 2. Buka Test Page
Buka di browser: `Frontend/test-api-sekretaris.html`

**Yang harus Anda lihat:**
- ✅ Status: 200 OK
- ✅ Count: 1
- ✅ hasFinalFile: YES - Will appear in list

**Jika masih NO:**
- Cek apakah `final_file_data` punya nilai (panjang > 0)
- Cek apakah `files.final.data` punya nilai

### 3. Buka Halaman Sekretaris
Buka: `Frontend/pages/sekretaris/daftar-masuk.html`

### 4. Check Browser Console
Tekan F12 → Console tab

**Log yang harus muncul:**
```
📥 Loaded items for role sekretaris: 1
📊 Items with status disposisi_to_sekretaris: 1
🔍 File presence for item: [ID] hasFile: true
✅ Final list count: 1
🔌 Attaching event listeners for return buttons...
Found 1 return buttons
🔌 Attaching event listeners for forward buttons...
Found 1 forward buttons
✅ All event listeners attached
```

**Jika log menunjukkan `hasFile: false`:**
Kemungkinan transformasi model belum aktif. Restart backend!

**Jika tidak ada log sama sekali:**
1. Periksa apakah ada error di console
2. Periksa apakah script `daftar-masuk.js` ter-load
3. Periksa apakah `API` object tersedia (ketik `API` di console)

### 5. Verifikasi Data di Browser Console

Jalankan command ini di console:
```javascript
API.pengajuan.getAll({ role: 'sekretaris', status: 'disposisi_to_sekretaris' })
  .then(data => {
    console.log('Data count:', data.length);
    if (data.length > 0) {
      const item = data[0];
      console.log('Item:', item);
      console.log('Has final_file_data:', !!item.final_file_data, '(' + (item.final_file_data||'').length + ' chars)');
      console.log('Has final_file:', !!item.final_file, '(' + (item.final_file||'').length + ' chars)');
      console.log('Has files.final.data:', !!(item.files?.final?.data), '(' + (item.files?.final?.data||'').length + ' chars)');
    }
  });
```

**Expected output:**
```
Data count: 1
Has final_file_data: true (1434708 chars)
Has final_file: true (1434708 chars)
Has files.final.data: true (1434708 chars)
```

## Kemungkinan Masalah & Solusi

### Masalah 1: Backend belum restart
**Solusi:** Restart backend server (langkah 1 di atas)

### Masalah 2: CORS Error
**Gejala:** Console menunjukkan CORS policy error
**Solusi:** Backend sudah punya CORS enabled, pastikan backend running di port 5000

### Masalah 3: API Base URL salah
**Gejala:** 404 atau network error
**Solusi:** Cek `Frontend/assets/js/api.js` - pastikan `API_BASE_URL = 'http://localhost:5000/api'`

### Masalah 4: List tetap kosong meski API return data
**Gejala:** Console log "Final list count: 0" padahal "Loaded items: 1"
**Solusi:** Cek apakah `hasFinalFile()` mendeteksi file dengan benar

### Masalah 5: Notifikasi tidak ada hubungannya!
**Penjelasan:** Penghapusan fitur notifikasi untuk sekretaris TIDAK mempengaruhi daftar surat masuk. Notifikasi dan list adalah fitur terpisah. List bergantung pada:
- Backend query ke database
- Frontend rendering
- Keberadaan file

## File yang Terlibat

1. **Backend:**
   - `Backend/models/Pengajuan.js` - Transform data untuk frontend
   - `Backend/controllers/pengajuanController.js` - Query & filter data

2. **Frontend:**
   - `Frontend/assets/js/api.js` - API client
   - `Frontend/assets/js/sekretaris/daftar-masuk.js` - List logic
   - `Frontend/pages/sekretaris/daftar-masuk.html` - UI

## Jika Masih Tidak Muncul

Kirim screenshot dari:
1. Output backend console saat API dipanggil
2. Browser console (F12) saat halaman daftar masuk dibuka
3. Network tab (F12 → Network) - cari request ke `/api/pengajuan?role=sekretaris...`
