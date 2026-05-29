# Fix Koordinator Detail View - Form Fields Display

## Masalah yang Dilaporkan
Pada saat koordinator rayon melihat detail surat yang diajukan jemaat:
1. Data field **perihal**, **jenis kelamin**, dan **catatan** yang telah diinput saat jemaat melakukan pengajuan tidak tampil
2. Field **lampiran** juga kosong (tidak menampilkan placeholder)
3. Permintaan untuk menambahkan field **Perihal** pada semua tipe surat

## Akar Masalah
1. **Form Data Structure**: MongoDB menyimpan data user input dalam field `form` (tipe Mixed), tetapi kode koordinator langsung mengakses `item.perihal`, `item.jk`, dll tanpa flatten data dari `item.form`
2. **Lampiran Display**: Saat tidak ada lampiran, tampil pesan "Tidak ada lampiran" alih-alih placeholder "-"
3. **Field Perihal**: Sebenarnya sudah ada di semua form, hanya perlu verifikasi

## Solusi yang Diterapkan

### 1. Flatten Form Data (✅ Selesai)
**File yang diubah:**
- `Frontend/assets/js/koordinator/daftar-surat-masuk.js`
- `Frontend/assets/js/koordinator/daftar-diverifikasi.js`

**Perubahan:**
```javascript
// Sebelum
async function openDetail(id){
    let item = null;
    try {
        item = await API.pengajuan.getById(id);
    } catch(e) {
        showInlineMessage('Data tidak ditemukan','error'); return;
    }
    if(!item){ showInlineMessage('Data tidak ditemukan','error'); return; }
    currentItem = item;
    // ... lanjut render

// Sesudah
async function openDetail(id){
    let item = null;
    try {
        item = await API.pengajuan.getById(id);
    } catch(e) {
        showInlineMessage('Data tidak ditemukan','error'); return;
    }
    if(!item){ showInlineMessage('Data tidak ditemukan','error'); return; }
    
    // Flatten form data into top level (same fix as Jemaat detail page)
    if (item.form && typeof item.form === 'object') {
      Object.assign(item, item.form);
    }
    
    currentItem = item;
    // ... lanjut render
```

**Penjelasan:**
- Menggunakan `Object.assign(item, item.form)` untuk menggabungkan data dari `form` object ke level atas
- Ini memungkinkan akses langsung ke `item.perihal`, `item.jk`, `item.catatan` dll
- Pola yang sama sudah diterapkan di `Frontend/assets/js/pengajuan-detail.js` untuk Jemaat

### 2. Placeholder "-" untuk Lampiran Kosong (✅ Selesai)
**File yang diubah:**
- `Frontend/assets/js/koordinator/daftar-surat-masuk.js`
- `Frontend/assets/js/koordinator/daftar-diverifikasi.js`

**Perubahan:**
```javascript
// Sebelum
if(files && files.length){
  html += files.map(f => {
    const url = typeof f === 'string' ? f : (f.url || f.path || f.link || f.data || '#');
    const name = typeof f === 'string' ? f.split('/').pop() : (f.name || f.filename || 'Lampiran');
    return `<div><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(name)}</a></div>`;
  }).join('');
} else html += `<div class="muted">Tidak ada lampiran.</div>`;

// Sesudah
if(files && files.length){
  html += files.map(f => {
    const url = typeof f === 'string' ? f : (f.url || f.path || f.link || f.data || '#');
    const name = typeof f === 'string' ? f.split('/').pop() : (f.name || f.filename || 'Lampiran');
    return `<div><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(name)}</a></div>`;
  }).join('');
} else {
  html += `-`;
}
```

**Penjelasan:**
- Saat tidak ada lampiran, tampilkan hanya "-" alih-alih "Tidak ada lampiran"
- Konsisten dengan field lain yang menampilkan "-" untuk nilai kosong
- Detail page Jemaat sudah menampilkan "-" untuk file kosong sejak awal

### 3. Field Perihal di Semua Tipe Surat (✅ Sudah Ada)
**Status:** Semua form sudah memiliki field Perihal

**Verifikasi di `Frontend/assets/js/pengajuan.js`:**

1. **Surat Saksi Nikah/Baptis:**
   ```javascript
   <div class="mb-3">
     <label class="form-label">Perihal</label>
     <input type="text" class="form-control" name="perihal" id="perihal" 
            value="${perihalValue}" readonly>
   </div>
   ```
   - Perihal: "Saksi Nikah" atau "Saksi Baptis" (readonly, auto-filled)

2. **Surat Rekomendasi Lainnya / Keterangan / Rekomendasi Menikah:**
   ```javascript
   ${input('perihal','Perihal','type="text" required')}
   ```
   - Perihal: Editable, required

3. **Surat Rekomendasi Kegiatan:**
   ```javascript
   ${input('perihal','Perihal','type="text" required')}
   ```
   - Perihal: Editable, required

4. **Surat Lainnya:**
   ```javascript
   ${input('perihal','Perihal','type="text" required')}
   ```
   - Perihal: Editable, required

## Testing Checklist
- [ ] Login sebagai Koordinator
- [ ] Buka "Daftar Surat Masuk" > "Belum Diverifikasi"
- [ ] Klik "Periksa" pada salah satu pengajuan
- [ ] Verifikasi field berikut tampil dengan benar:
  - [ ] Perihal / Ringkasan
  - [ ] Jenis Kelamin (pada surat Rekomendasi/Keterangan)
  - [ ] Catatan
  - [ ] Lampiran (tampil "-" jika kosong, atau link download jika ada)
- [ ] Buka "Daftar Surat Masuk" > "Telah Diverifikasi"
- [ ] Klik "Periksa" pada salah satu pengajuan yang sudah diverifikasi
- [ ] Verifikasi field yang sama tampil dengan benar
- [ ] Login sebagai Jemaat
- [ ] Buat pengajuan surat baru (semua tipe)
- [ ] Verifikasi field Perihal ada di semua form
- [ ] Submit dan verifikasi di detail pengajuan Jemaat juga tampil benar

## Files Modified
1. `Frontend/assets/js/koordinator/daftar-surat-masuk.js`
   - Added form data flattening in `openDetail()` function
   - Changed empty lampiran display from message to "-"

2. `Frontend/assets/js/koordinator/daftar-diverifikasi.js`
   - Added form data flattening in `openDetail()` function
   - Changed empty lampiran display from message to "-"

## Related Issues Fixed Previously
- Jemaat detail page (fixed in `pengajuan-detail.js`) - same form flattening issue
- Admin account detail page - migrated to API calls
- Logout confirmation modal - added to all Jemaat pages

## Technical Notes
- MongoDB stores user form input in `form: Mixed` field
- Frontend needs to flatten this object for easier rendering
- `Object.assign(item, item.form)` merges form data to top level
- This pattern should be used in ALL detail view pages across all roles
- Consistency: use "-" for empty/null values, not verbose messages

## Impact
- ✅ Koordinator dapat melihat semua data form yang diinput Jemaat
- ✅ Tampilan lebih konsisten dan rapi dengan placeholder "-"
- ✅ Semua tipe surat sudah memiliki field Perihal
- ✅ Tidak ada perubahan pada struktur database
- ✅ Tidak ada breaking changes pada fitur lain
