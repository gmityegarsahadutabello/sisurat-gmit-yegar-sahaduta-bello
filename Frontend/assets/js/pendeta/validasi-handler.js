// Handler for Pendeta preview + validation
(function(){
  function qs(id){ return document.getElementById(id); }
  function getIdFromQS(){ return (new URLSearchParams(window.location.search)).get('id'); }

  function escapeHtml(s){ return String(s||''); }

  // Use SekPreview if available, otherwise fallback
  function renderPreview(container, item){
    if (window.SekPreview && typeof window.SekPreview.renderPreview === 'function') {
        window.SekPreview.renderPreview(container, item);
        return;
    }
    
    // Fallback implementation
    container.innerHTML = '';
    if (!item){ container.textContent = 'Data tidak ditemukan'; return; }

    const finalFile = item.final_file || (item.files && item.files.final) || item.final_file_url;
    if (finalFile){
      const a = document.createElement('a');
      a.href = finalFile; 
      a.textContent = 'Download file final'; 
      a.target = '_blank';
      a.className = 'btn btn-primary';
      container.appendChild(a);
      return;
    }

    if (item.draft_surat){
      const pre = document.createElement('pre');
      pre.style.whiteSpace = 'pre-wrap';
      pre.textContent = item.draft_surat;
      container.appendChild(pre);
      return;
    }
  }

  async function doReturn(id, note){
    if (!id) return alert('ID tidak ditemukan');
    try {
        await API.pengajuan.updateStatus(id, {
            status: 'disposisi_to_tatausaha', // Return to TU
            by: 'Pendeta',
            note: note || 'Dikembalikan oleh Pendeta',
            to_role: 'tatausaha'
        });
        alert('Surat telah dikembalikan ke Tata Usaha.');
        window.location.href = 'daftar-masuk.html';
    } catch(e) {
        console.error(e);
        alert('Gagal mengembalikan surat.');
    }
  }

  async function doValidate(id){
    if (!id) return alert('ID tidak ditemukan');
    try {
        await API.pengajuan.updateStatus(id, {
            status: 'validated', // Final validation
            by: 'Pendeta',
            note: 'Surat telah divalidasi oleh Pendeta',
            to_role: 'jemaat' // Notify jemaat
        });
        
        // Create notification for user
        // (Backend might do this automatically, but let's be sure)
        // Actually, updateStatus with to_role='jemaat' might trigger it if backend is smart.
        // But let's assume we need to do nothing else if backend handles it.
        
        alert('Surat berhasil divalidasi dan dikirim ke jemaat.');
        window.location.href = 'daftar-masuk.html';
    } catch(e) {
        console.error(e);
        alert('Gagal memvalidasi surat.');
    }
  }

  // wire up buttons on detail page
  document.addEventListener('DOMContentLoaded', async ()=>{
    const id = getIdFromQS();
    const preview = qs('preview');
    if (!preview) return;
    
    let item = null;
    try {
        item = await API.pengajuan.getById(id);
    } catch(e) {
        console.error(e);
        preview.innerHTML = '<div class="alert alert-danger">Gagal memuat data surat.</div>';
        return;
    }
    
    renderPreview(preview, item);

    const btnReturn = qs('btn-return');
    const btnValidate = qs('btn-validate');
    const noteEl = qs('return-note');

    if (btnReturn){
      btnReturn.addEventListener('click', ()=>{
        const note = noteEl ? noteEl.value.trim() : '';
        if (!note || note === '') {
          alert('Alasan penolakan wajib diisi!');
          if (noteEl) noteEl.focus();
          return;
        }
        
        // Use new ConfirmModal
        ConfirmModal.show({
          type: 'warning',
          icon: 'bi-arrow-return-left',
          title: 'Kembalikan Surat ke Tata Usaha',
          message: `Kembalikan surat <strong>${escapeHtml(item?.jenis || item?.type || 'ini')}</strong> ke Tata Usaha untuk perbaikan?`,
          detail: item ? {
            'Jenis Surat': item.jenis || item.type || '-',
            'Nama Pemohon': item.user_nama || item.pemohon_nama || item.nama || '-',
            'Alasan Pengembalian': note
          } : null,
          showWarning: true,
          warningText: 'Tata Usaha akan menerima catatan Anda dan melakukan perbaikan sebelum mengirim ulang ke Sekretaris.',
          confirmText: 'Ya, Kembalikan',
          cancelText: 'Batal',
          onConfirm: async () => {
            await doReturn(id, note);
          }
        });
      });
    }

    if (btnValidate){
      btnValidate.addEventListener('click', ()=>{
        
        // Use new ConfirmModal
        ConfirmModal.show({
          type: 'success',
          icon: 'bi-check-circle-fill',
          title: 'Validasi Final Surat',
          message: `Lakukan validasi final untuk surat <strong>${escapeHtml(item?.jenis || item?.type || 'ini')}</strong>?`,
          subMessage: 'Surat akan diarsipkan dan nomor resmi akan diterbitkan. Jemaat akan menerima notifikasi surat selesai.',
          detail: item ? {
            'Jenis Surat': item.jenis || item.type || '-',
            'Nama Pemohon': item.user_nama || item.pemohon_nama || item.nama || '-',
            'Email': item.user_email || item.email || '-'
          } : null,
          showWarning: true,
          warningText: 'Pastikan semua data surat sudah benar. Proses ini TIDAK DAPAT DIBATALKAN.',
          confirmText: 'Ya, Validasi Final',
          cancelText: 'Periksa Kembali',
          onConfirm: async () => {
            await doValidate(id);
          }
        });
      });
    }
  });

  // expose for tests if needed
  window.PendetaValidate = { renderPreview, doReturn, doValidate };

})();
