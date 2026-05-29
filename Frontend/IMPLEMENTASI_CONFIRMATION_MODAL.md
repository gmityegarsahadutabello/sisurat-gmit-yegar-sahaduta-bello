# Panduan Implementasi Confirmation Modal

## Cara Menggunakan di Semua Halaman

### 1. Tambahkan CSS dan JS di HTML
```html
<!-- Tambahkan di <head> -->
<link rel="stylesheet" href="../../assets/css/confirmation-modal.css">

<!-- Tambahkan sebelum </body> -->
<script src="../../assets/js/confirmation-modal.js"></script>
```

### 2. Load Modal Component
Modal akan otomatis di-load saat pertama kali digunakan.

---

## Contoh Implementasi

### A. KOORDINATOR - Verifikasi Surat

**Sebelum (old confirm):**
```javascript
const ok = confirm('Verifikasi surat ini?');
if (!ok) return;
// proses verifikasi
```

**Sesudah (new modal):**
```javascript
ConfirmModal.show({
  type: 'success',
  title: 'Verifikasi Surat',
  message: `Apakah Anda yakin ingin <strong>verifikasi</strong> surat dari <strong>${item.nama}</strong>?`,
  subMessage: 'Surat akan diteruskan ke Tata Usaha setelah diverifikasi.',
  detail: {
    'Nama Pengaju': item.nama,
    'Jenis Surat': item.jenis || item.type,
    'Rayon': item.rayon
  },
  showWarning: true,
  warningText: 'Pastikan semua data sudah benar sebelum melanjutkan.',
  confirmText: 'Ya, Verifikasi',
  cancelText: 'Batal',
  onConfirm: () => {
    // Proses verifikasi
    LS.verify('local_pengajuan', item.id);
    showToast('success', 'Surat berhasil diverifikasi!');
    loadAndRender();
  }
});
```

### B. KOORDINATOR - Tolak Surat

**Sesudah (new modal with input):**
```javascript
ConfirmModal.show({
  type: 'danger',
  title: 'Tolak Pengajuan Surat',
  message: `Anda akan <strong>menolak</strong> surat dari <strong>${item.nama}</strong>`,
  subMessage: 'Pengaju akan menerima notifikasi penolakan dengan alasan yang Anda berikan.',
  detail: {
    'Nama Pengaju': item.nama,
    'Jenis Surat': item.jenis || item.type,
    'Tanggal Pengajuan': formatDate(item.created_at)
  },
  showInput: true,
  inputLabel: 'Alasan Penolakan',
  inputRequired: true,
  inputMinLength: 10,
  inputPlaceholder: 'Jelaskan alasan penolakan surat ini...',
  showWarning: true,
  warningText: 'Penolakan tidak dapat dibatalkan setelah dikonfirmasi.',
  confirmText: 'Tolak Surat',
  cancelText: 'Batal',
  onConfirm: (alasan) => {
    // Proses penolakan dengan alasan
    LS.reject('local_pengajuan', item.id, alasan);
    showToast('success', 'Surat berhasil ditolak');
    loadAndRender();
  }
});
```

### C. TATA USAHA - Disposisi ke Sekretaris

```javascript
ConfirmModal.show({
  type: 'primary',
  icon: 'bi-send-check-fill',
  title: 'Konfirmasi Disposisi Surat',
  message: 'Anda akan mengirim surat ini ke <strong>Sekretaris</strong> untuk proses selanjutnya.',
  subMessage: 'Pastikan file surat telah diunggah dengan benar.',
  detail: {
    'Jenis Surat': item.jenis,
    'Nama Pengaju': item.nama,
    'File Surat': item.final_file_name || 'Belum upload'
  },
  showWarning: true,
  warningText: 'Setelah disposisi dikirim, surat akan diproses oleh Sekretaris.',
  confirmText: 'Ya, Kirim Disposisi',
  onConfirm: () => {
    LS.pushDisposisi(item.id, 'tatausaha', 'sekretaris', 'Dikirim oleh Tata Usaha');
    showToast('success', 'Disposisi berhasil dikirim!');
    setTimeout(() => window.location.href = 'daftar-disposisi.html', 1500);
  }
});
```

### D. SEKRETARIS/PENDETA - Return ke Tata Usaha

```javascript
ConfirmModal.show({
  type: 'warning',
  title: 'Kembalikan Surat ke Tata Usaha',
  message: 'Surat akan <strong>dikembalikan</strong> ke Tata Usaha untuk perbaikan.',
  subMessage: 'Berikan catatan yang jelas agar Tata Usaha dapat melakukan perbaikan.',
  showInput: true,
  inputLabel: 'Catatan Perbaikan',
  inputRequired: true,
  inputMinLength: 15,
  inputPlaceholder: 'Jelaskan apa yang perlu diperbaiki...',
  showWarning: true,
  warningText: 'Surat akan kembali ke status "Perlu Perbaikan".',
  confirmText: 'Kembalikan Surat',
  onConfirm: (catatan) => {
    LS.returnToTU(item.id, catatan);
    showToast('success', 'Surat berhasil dikembalikan ke Tata Usaha');
    loadAndRender();
  }
});
```

### E. PENDETA - Validasi Final

```javascript
ConfirmModal.show({
  type: 'success',
  icon: 'bi-patch-check-fill',
  title: 'Validasi Final Surat',
  message: 'Anda akan memberikan <strong>validasi final</strong> untuk surat ini.',
  subMessage: 'Surat yang sudah divalidasi akan mendapat nomor surat otomatis.',
  detail: {
    'Jenis Surat': item.jenis,
    'Nama Pengaju': item.nama,
    'Status Saat Ini': 'Menunggu Validasi Pendeta'
  },
  showInput: true,
  inputLabel: 'Catatan Validasi (Opsional)',
  inputRequired: false,
  inputPlaceholder: 'Tambahkan catatan jika diperlukan...',
  showWarning: true,
  warningText: 'Nomor surat akan dibuat otomatis setelah validasi.',
  confirmText: 'Ya, Validasi Surat',
  onConfirm: (catatan) => {
    PenValidation.validateSurat(item.id, catatan);
    showToast('success', 'Surat berhasil divalidasi!');
    loadAndRender();
  }
});
```

### F. ADMIN - Delete Account

```javascript
ConfirmModal.show({
  type: 'danger',
  icon: 'bi-trash-fill',
  title: 'Hapus Akun Pengguna',
  message: `Anda akan <strong>menghapus permanen</strong> akun <strong>${user.name}</strong>`,
  subMessage: 'Data akun dan riwayat aktivitas akan dihapus dari sistem.',
  detail: {
    'Nama': user.name,
    'Email': user.email,
    'Role': user.role,
    'Status': user.active ? 'Aktif' : 'Nonaktif'
  },
  showWarning: true,
  warningText: 'PERINGATAN: Tindakan ini TIDAK DAPAT DIBATALKAN!',
  confirmText: 'Ya, Hapus Akun',
  onConfirm: () => {
    deleteUser(user.id);
    showToast('success', 'Akun berhasil dihapus');
    loadAndRender();
  }
});
```

---

## Parameter Lengkap

```javascript
ConfirmModal.show({
  type: 'primary' | 'success' | 'danger' | 'warning' | 'info',  // Warna tema
  icon: 'bi-icon-name',                    // Custom icon (optional)
  title: 'Judul Modal',                    // Judul utama
  message: 'Pesan utama (bisa HTML)',      // Pesan utama
  subMessage: 'Pesan sekunder',            // Pesan tambahan (optional)
  
  detail: {                                // Detail info (optional)
    'Label 1': 'Value 1',
    'Label 2': 'Value 2'
  },
  
  showInput: false,                        // Tampilkan textarea (optional)
  inputLabel: 'Label input',               // Label textarea
  inputRequired: false,                    // Wajib diisi?
  inputMinLength: 0,                       // Minimal karakter
  inputPlaceholder: 'Placeholder...',      // Placeholder textarea
  
  showWarning: false,                      // Tampilkan warning box (optional)
  warningText: 'Teks warning',             // Teks warning
  
  confirmText: 'Konfirmasi',               // Teks tombol konfirmasi
  cancelText: 'Batal',                     // Teks tombol batal
  
  onConfirm: (inputValue) => {},           // Callback saat confirm
  onCancel: () => {}                       // Callback saat cancel (optional)
});
```

---

## Fungsi Tambahan

### Set Loading State
```javascript
// Tampilkan loading saat proses async
ConfirmModal.setLoading(true);

// Matikan loading setelah selesai
ConfirmModal.setLoading(false);
```

### Manual Hide
```javascript
ConfirmModal.hide();
```

---

## Tips Best Practices

1. **Gunakan `type` yang sesuai:**
   - `success` - Untuk verifikasi, approve, validasi
   - `danger` - Untuk delete, reject, remove
   - `warning` - Untuk return, rollback
   - `primary` - Untuk disposisi, forward
   - `info` - Untuk informasi umum

2. **Detail Object:**
   - Tampilkan info penting yang perlu dikonfirmasi user
   - Max 4-5 items agar tidak terlalu panjang

3. **Input Validation:**
   - Set `inputRequired: true` untuk input wajib
   - Set `inputMinLength` untuk memastikan input berkualitas

4. **Warning Text:**
   - Gunakan untuk aksi yang irreversible
   - Buat jelas konsekuensinya

5. **Callback:**
   - Input value (jika ada) akan diteruskan ke `onConfirm`
   - Handle async operations dengan proper loading state

---

## Migration Checklist

- [ ] Replace semua `confirm()` dan `alert()` native
- [ ] Replace semua `<dialog>` manual dengan ConfirmModal
- [ ] Konsisten gunakan showToast untuk feedback
- [ ] Test semua konfirmasi di setiap role
- [ ] Pastikan responsive di mobile
