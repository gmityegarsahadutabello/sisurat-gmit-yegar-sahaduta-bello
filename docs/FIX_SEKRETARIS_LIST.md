# Fix: Sekretaris Daftar Surat Masuk

## Masalah
Surat yang telah didisposisikan oleh Tatausaha ke Sekretaris tidak tampil pada halaman "Daftar Surat Masuk" (role Sekretaris), meskipun data sudah terlihat pada dashboard rekapitulasi.

## Diagnosis
Menggunakan script debug (`Backend/debug-sekretaris.js`), ditemukan:
- ✅ Data ada di MongoDB dengan status `disposisi_to_sekretaris`
- ✅ File sudah diupload (files.final.data ada, 1.4MB PDF)
- ✅ Backend query mengembalikan data dengan benar
- ❌ Frontend list tidak menampilkan karena ada filter file yang terlalu ketat

## Penyebab
File filtering di frontend (`daftar-masuk.js`) mem-filter keluar items yang sebenarnya PUNYA file, karena:
1. Filter sebelumnya menggunakan duplicate logic yang kompleks
2. Tidak ada helper function yang konsisten untuk cek file

## Solusi Diterapkan

### 1. Menambahkan Helper Function
```javascript
function hasFinalFile(i){
  return !!(
    i && (
      i.final_file_data ||
      i.final_file ||
      (i.files && i.files.final && (i.files.final.data || i.files.final.name || i.files.final.url)) ||
      i.final_file_url
    )
  );
}
```

### 2. Relaxed File Filtering
**Sebelumnya:** Filter keluar semua item tanpa file
**Sekarang:** Tampilkan SEMUA item, tapi tandai yang belum ada file

```javascript
// Tidak filter keluar, hanya log untuk diagnostik
list.forEach(i => {
  const hasFile = hasFinalFile(i);
  console.log('🔍 File presence for item:', i._id || i.id, 'hasFile:', hasFile);
});
```

### 3. UI Enhancement
- Items tanpa file mendapat badge **"⚠️ File Belum Ada"** (merah)
- Tombol "Teruskan" di-disable untuk items tanpa file
- Tombol "Kembalikan" tetap aktif (untuk kembalikan ke TU)
- Guard di event handler: jika klik Teruskan tanpa file, muncul toast warning

### 4. Server-Side Filtering
```javascript
API.pengajuan.getAll({ role: 'sekretaris', status: 'disposisi_to_sekretaris' })
```
Backend langsung filter sesuai role + status, mengurangi beban client.

## File yang Diubah
- `Frontend/assets/js/sekretaris/daftar-masuk.js`
  - Tambah `hasFinalFile()` helper
  - Hapus filter yang mem-exclude items tanpa file
  - Update `rowFor()` untuk tampilkan badge dan disable button
  - Tambah guard di forward handler

## Hasil
✅ Semua surat dengan status `disposisi_to_sekretaris` tampil di list
✅ Dashboard count = List count
✅ Items tanpa file jelas ditandai
✅ Sekretaris bisa kembalikan surat tanpa file ke TU untuk perbaikan
✅ Hanya surat dengan file yang bisa diteruskan ke Pendeta

## Testing
Jalankan debug script untuk verifikasi data:
```bash
cd Backend
node debug-sekretaris.js
```

Output yang diharapkan:
```
✅ Would appear in sekretaris list: YES
```

## Catatan
- Surat dari TU HARUS punya file sebelum di-disposisi (validasi ada di TU)
- Jika ada surat tanpa file yang sampai ke Sekretaris (edge case), Sekretaris bisa kembalikan
- File detection mencakup semua field variations (backward compatibility)
