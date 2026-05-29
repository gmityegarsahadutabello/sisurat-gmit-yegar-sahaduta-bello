
# Fix Bug: Surat Validated Muncul Kembali di Daftar Masuk

## 🐛 Masalah yang Diperbaiki

Setelah Pendeta melakukan validasi final surat, surat tersebut seharusnya:
- ✅ Masuk ke **Arsip Surat** (Tata Usaha)
- ✅ **TIDAK** muncul lagi di Daftar Masuk Sekretaris
- ✅ **TIDAK** muncul lagi di Daftar Masuk Pendeta
- ✅ **TIDAK** muncul lagi di Daftar Terverifikasi (Tata Usaha)

**Bug yang terjadi:**
Surat yang sudah divalidasi malah muncul kembali di Daftar Masuk Sekretaris dan Pendeta dengan status "belum divalidasi".

---

## 🔍 Penyebab Bug

1. **Fungsi `markValidated`** di `api.js`:
   - Mengubah status surat menjadi `'validated'`
   - Menambahkan surat ke `local_arsip`
   - **TAPI** surat tetap ada di `local_pengajuan` dengan status `'validated'`

2. **Filter di `loadList()`** Sekretaris dan Pendeta:
   - Tidak mengecualikan surat dengan status `'validated'` atau `'archived'`
   - Sehingga surat yang sudah selesai masih muncul di daftar masuk

3. **Filter di Tata Usaha**:
   - Daftar Terverifikasi masih menampilkan surat yang sudah `'validated'`
   - Seharusnya hanya menampilkan surat yang sedang diproses (belum validated)

---

## ✅ Perbaikan yang Dilakukan

### 1. **Filter Daftar Masuk Sekretaris** (`assets/js/sekretaris/daftar-masuk.js`)

**Sebelum:**
```javascript
function loadList(){
  let list = LS.getPengajuanForRole('sekretaris') || [];
  list = list.filter(i => String((i && i.status) || '').toLowerCase() !== 'ditolak');
  list = list.filter(i => i && (i.final_file_data || i.final_file));
  return list;
}
```

**Sesudah:**
```javascript
function loadList(){
  let list = LS.getPengajuanForRole('sekretaris') || [];
  list = list.filter(i => String((i && i.status) || '').toLowerCase() !== 'ditolak');
  // ✅ TAMBAHAN: Exclude validated/archived items
  list = list.filter(i => {
    const status = String((i && i.status) || '').toLowerCase();
    return status !== 'validated' && status !== 'archived' && !i.validated && !i.archived;
  });
  list = list.filter(i => i && (i.final_file_data || i.final_file));
  return list;
}
```

---

### 2. **Filter Daftar Masuk Pendeta** (`assets/js/pendeta/daftar-masuk.js`)

**Sebelum:**
```javascript
function loadList(){
  let list = LS.getPengajuanForRole('pendeta') || [];
  list = list.filter(i => String((i && i.status) || '').toLowerCase() !== 'ditolak');
  return list;
}
```

**Sesudah:**
```javascript
function loadList(){
  let list = LS.getPengajuanForRole('pendeta') || [];
  list = list.filter(i => String((i && i.status) || '').toLowerCase() !== 'ditolak');
  // ✅ TAMBAHAN: Exclude validated/archived items
  list = list.filter(i => {
    const status = String((i && i.status) || '').toLowerCase();
    return status !== 'validated' && status !== 'archived' && !i.validated && !i.archived;
  });
  return list;
}
```

---

### 3. **Filter Daftar Disposisi Pendeta** (`assets/js/pendeta/daftar-disposisi.js`)

**Sebelum:**
```javascript
function loadList(){
  const all = LS.loadArray('local_pengajuan') || [];
  return all.filter(i => i && i.status === 'validated_by_pendeta'); // ❌ Status ini tidak pernah di-set!
}
```

**Sesudah:**
```javascript
function loadList(){
  const all = LS.loadArray('local_pengajuan') || [];
  return all.filter(i => {
    if (!i) return false;
    const s = String(i.status||'').toLowerCase();
    // ✅ Filter yang benar: validated, archived, atau flag validated
    return (s === 'validated' || s === 'archived' || i.validated === true);
  });
}
```

---

### 4. **Filter Daftar Terverifikasi Tata Usaha** (`assets/js/tatausaha/daftar-terverifikasi.js`)

**Sebelum:**
```javascript
function loadList(){
  const all = LS.loadArray('local_pengajuan') || [];
  const list = all.filter(i => i && (i.status === 'diterima' || i.verified_by_koordinator === true));
  return list;
}
```

**Sesudah:**
```javascript
function loadList(){
  const all = LS.loadArray('local_pengajuan') || [];
  // ✅ Hanya tampilkan yang sudah diverifikasi koordinator TAPI belum validated final
  const list = all.filter(i => {
    if (!i) return false;
    const status = String(i.status || '').toLowerCase();
    const isVerified = (status === 'diterima' || i.verified_by_koordinator === true);
    const isCompleted = (status === 'validated' || status === 'archived' || i.validated || i.archived);
    return isVerified && !isCompleted;
  });
  return list;
}
```

---

### 5. **Generate Nomor Surat Otomatis** (`assets/js/api.js`)

**Perbaikan pada fungsi `markValidated`:**

```javascript
markValidated(id, byRole){
  const key = 'local_pengajuan';
  const it = this.find(key, i => i && String(i.id) === String(id));
  if (!it) return null;
  const at = new Date().toISOString();
  it.status = 'validated'; 
  it.validated = true; 
  it.validated_by = byRole || 'pendeta'; 
  it.validated_at = at; 
  it.last_updated = at;
  
  // ✅ TAMBAHAN: Generate nomor surat jika belum ada
  if (!it.nomor_surat && !it.no) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const jenis = (it.jenis || it.type || 'SURAT').toUpperCase().replace(/\s+/g, '-');
    const counter = String(Math.floor(Math.random() * 9000) + 1000); // 4 digit random
    it.nomor_surat = `${counter}/${jenis}/GMIT-YEGAR/${month}/${year}`;
  }
  
  it.timeline = it.timeline || [];
  it.timeline.push({ 
    at, 
    by: byRole || 'pendeta', 
    action: 'validated', 
    keterangan: `Validasi final - Nomor: ${it.nomor_surat || it.no || '-'}` 
  });
  this.updateById(key, id, it);
  
  // Push to archive
  const arr = this.loadArray('local_arsip') || [];
  arr.unshift(it);
  this.saveArray('local_arsip', arr);
  
  // Create notification for jemaat
  this.createJemaatNotification(id, 'surat_masuk', ...);
  
  return it;
}
```

**Format Nomor Surat:**
```
<counter>/<JENIS-SURAT>/GMIT-YEGAR/<MM>/<YYYY>

Contoh:
1234/SURAT-BAPTIS/GMIT-YEGAR/11/2025
5678/SURAT-NIKAH/GMIT-YEGAR/12/2025
```

---

## 🎯 Hasil Setelah Perbaikan

### Alur Lengkap Surat yang Benar:

1. **Jemaat** → Mengajukan surat
2. **Koordinator** → Verifikasi (status: `diterima` / `verified_by_koordinator`)
3. **Tata Usaha** → Upload file (status: `disposisi_to_sekretaris`)
4. **Sekretaris** → Teruskan ke Pendeta (status: `disposisi_to_pendeta`)
5. **Pendeta** → Validasi Final (status: `validated`)
   - ✅ Surat **masuk ke Arsip** (Tata Usaha)
   - ✅ Surat **hilang dari Daftar Masuk** Sekretaris & Pendeta
   - ✅ Surat **hilang dari Daftar Terverifikasi** Tata Usaha
   - ✅ Surat **muncul di Daftar Disposisi** Pendeta & Sekretaris (untuk tracking)
   - ✅ **Nomor surat otomatis** di-generate
   - ✅ Jemaat **menerima notifikasi** surat selesai

### Lokasi Surat Berdasarkan Status:

| Status | Koordinator | Tata Usaha (Terverifikasi) | Tata Usaha (Arsip) | Sekretaris (Masuk) | Pendeta (Masuk) | Pendeta (Disposisi) |
|--------|-------------|---------------------------|-------------------|-------------------|-----------------|-------------------|
| `submitted` | ✅ Masuk | ❌ | ❌ | ❌ | ❌ | ❌ |
| `diterima` | ❌ | ✅ Terverifikasi | ❌ | ❌ | ❌ | ❌ |
| `disposisi_to_sekretaris` | ❌ | ❌ | ❌ | ✅ Masuk | ❌ | ❌ |
| `disposisi_to_pendeta` | ❌ | ❌ | ❌ | ✅ Disposisi | ✅ Masuk | ❌ |
| `validated` | ❌ | ❌ | ✅ **ARSIP** | ✅ Disposisi | ❌ | ✅ **Disposisi** |

---

## 🧪 Testing

### Test Case 1: Validasi Normal
1. Login sebagai **Pendeta**
2. Buka **Daftar Masuk**
3. Pilih surat yang sudah di-upload Tata Usaha
4. Klik **Validasi Final**
5. **Verifikasi:**
   - ✅ Surat hilang dari Daftar Masuk Pendeta
   - ✅ Surat muncul di Daftar Disposisi Pendeta
   - ✅ Nomor surat otomatis ter-generate

### Test Case 2: Arsip Tata Usaha
1. Login sebagai **Tata Usaha**
2. Buka **Arsip Surat**
3. **Verifikasi:**
   - ✅ Surat yang baru divalidasi muncul di arsip
   - ✅ Surat memiliki nomor surat
   - ✅ Tombol Download tersedia

### Test Case 3: Sekretaris Tidak Melihat Lagi
1. Login sebagai **Sekretaris**
2. Buka **Daftar Masuk**
3. **Verifikasi:**
   - ✅ Surat yang sudah validated TIDAK muncul
4. Buka **Daftar Disposisi**
5. **Verifikasi:**
   - ✅ Surat yang sudah validated muncul dengan status "Selesai"

---

## 📝 Catatan Tambahan

### Perbedaan Status:
- `validated`: Surat sudah selesai validasi final oleh Pendeta
- `archived`: Surat sudah diarsipkan (sama dengan validated)
- `validated_by_pendeta`: ❌ **TIDAK DIGUNAKAN** (status lama yang salah)

### Flag Boolean:
- `item.validated = true`: Penanda surat sudah validated
- `item.archived = true`: Penanda surat sudah archived

### Rekomendasi:
Gunakan kombinasi filter untuk memastikan:
```javascript
const isCompleted = (
  status === 'validated' || 
  status === 'archived' || 
  item.validated === true || 
  item.archived === true
);
```

---

## ✅ File yang Diubah

1. ✅ `assets/js/api.js` - Tambah generate nomor surat otomatis
2. ✅ `assets/js/sekretaris/daftar-masuk.js` - Filter exclude validated
3. ✅ `assets/js/pendeta/daftar-masuk.js` - Filter exclude validated
4. ✅ `assets/js/pendeta/daftar-disposisi.js` - Perbaiki filter status
5. ✅ `assets/js/tatausaha/daftar-terverifikasi.js` - Exclude validated dari terverifikasi

---

**Status:** ✅ **Bug Fixed - Tested & Verified**  
**Tanggal:** 29 November 2025
