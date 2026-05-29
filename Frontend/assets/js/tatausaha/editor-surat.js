// Simple editor utility for Tata Usaha
(function(){
  function qs(id){ return document.getElementById(id); }

  // get current item id from querystring when on detail page
  function getIdFromQS(){ return (new URLSearchParams(window.location.search)).get('id'); }

  // Open editor dialog if present
  function openEditor(initial){
    const dlg = qs('editor-dialog');
    const ta = qs('editor-text');
    if (!dlg || !ta) return;
    ta.value = initial || '';
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.style.display = 'block';
  }

  async function saveDraft(){
    const id = getIdFromQS();
    const ta = qs('editor-text');
    if (!id || !ta) { alert('Tidak ada ID pengajuan'); return; }
    const text = ta.value;
    // Simpan draft tanpa menimpa timeline lama; tambahkan event via addTimeline
    LS.updateById('local_pengajuan', id, { draft_surat: text, last_updated: new Date().toISOString(), processed_by_tatausaha: true });
    try { LS.addTimeline('local_pengajuan', id, { by:'tatausaha', action:'draft_saved', note:'Draft disimpan' }); } catch(e){}
    alert('Draft disimpan ke localStorage.');
    const dlg = qs('editor-dialog'); if (typeof dlg.close === 'function') dlg.close();
  }

  function wire(){
    const btnEdit = qs('btn-edit');
    const fileInput = qs('file-upload');
    const btnDisposisi = qs('btn-disposisi');
    const saveBtn = qs('editor-save');
    const cancelBtn = qs('editor-cancel');

    if (btnEdit) btnEdit.addEventListener('click', async ()=>{
      const id = getIdFromQS();
      const item = id ? LS.find('local_pengajuan', x=>x.id==id) : null;
      openEditor(item ? (item.draft_surat || '') : '');
    });

    if (saveBtn) saveBtn.addEventListener('click', (e)=>{ e.preventDefault(); saveDraft(); });
    if (cancelBtn) cancelBtn.addEventListener('click', ()=>{ const dlg = qs('editor-dialog'); if (typeof dlg.close==='function') dlg.close(); });

    if (fileInput) fileInput.addEventListener('change', (e)=>{
      const f = e.target.files && e.target.files[0];
      const id = getIdFromQS();
      if (!f || !id) return;
      const reader = new FileReader();
      reader.onload = function(ev){
        const dataUrl = ev.target.result;
        // Simpan file final tanpa menimpa jejak; tambahkan timeline via helper
        LS.updateById('local_pengajuan', id, { final_file: dataUrl, file_name: f.name, last_updated: new Date().toISOString() });
        try { LS.addTimeline('local_pengajuan', id, { by:'tatausaha', action:'file_uploaded', note:`File ${f.name} diunggah` }); } catch(e){}
        alert('File terunggah (disimpan ke localStorage). Klik Disposisi untuk mengirim ke Sekretaris.');
      };
      reader.readAsDataURL(f);
    });

    if (btnDisposisi) btnDisposisi.addEventListener('click', ()=>{
      const id = getIdFromQS();
      if (!id) return alert('ID tidak ditemukan.');
      const item = LS.find('local_pengajuan', x=>x.id==id);
      if (!item) return alert('Data tidak ditemukan.');
      // require final_file or draft_surat
      if (!item.final_file && !item.draft_surat) return alert('Mohon buat atau unggah surat sebelum disposisi.');
      // Gunakan helper agar timeline tidak terputus dan notifikasi konsisten
      LS.pushDisposisi(id, 'tatausaha', 'sekretaris', 'Dikirim oleh Tata Usaha');
      alert('Surat telah didisposisikan ke Sekretaris.');
      // redirect back to daftar
      window.location.href = 'daftar-terverifikasi.html';
    });
  }

  document.addEventListener('DOMContentLoaded', wire);

  // export for tests
  window.TUEditor = { openEditor, saveDraft };

})();
