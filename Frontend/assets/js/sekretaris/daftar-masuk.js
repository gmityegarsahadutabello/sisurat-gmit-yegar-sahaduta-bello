// Sekretaris - daftar surat masuk (disposisi ke sekretaris)
(function(){
  function qs(id){ return document.getElementById(id); }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmtDateTime(ts){
    try {
      const d = new Date(ts);
      if (isNaN(d)) return '-';
      return d.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    } catch(e){ return ts || '-'; }
  }

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

  async function loadList(){
    let list = [];
    try {
      const all = await API.pengajuan.getAll({ role: 'sekretaris', status: 'disposisi_to_sekretaris' });
      console.log('📥 Loaded items for role sekretaris:', Array.isArray(all) ? all.length : 0);
      list = Array.isArray(all) ? all : [];
      console.log('📊 Items with status disposisi_to_sekretaris:', list.length);
    } catch(e) {
        console.error("Failed to load pengajuan", e);
        list = [];
    }
    
    // Log file presence for each item but DO NOT filter out missing files
    // Sekretaris can see all disposed items and return those without files to TU
    list.forEach(i => {
      const hasFile = hasFinalFile(i);
      console.log('🔍 File presence for item:', i._id || i.id, 'hasFile:', hasFile);
    });
    
    console.log('✅ Final list count:', list.length);
    return list;
  }

  function rowFor(item){
    const tr = document.createElement('tr');
    const hasFile = hasFinalFile(item);
    tr.innerHTML = `
      <td>${fmtDateTime(item.created_at||item.createdAt||item.time||'')}</td>
      <td>${esc(item.jenis||item.type||'')}</td>
      <td>${esc(item.user_nama||item.pemohon_nama||item.nama||item.name||item.pemohon||'')}</td>
      <td>
        <span class="badge bg-warning text-dark">${esc(item.status||'')}</span>
        ${hasFile ? '' : '<span class="badge bg-danger ms-2" title="File belum diupload oleh Tata Usaha">⚠️ File Belum Ada</span>'}
      </td>
      <td>
        <div style="display:flex;gap:8px">
          <a class="btn btn-sm btn-outline-primary" href="detail-preview.html?id=${encodeURIComponent(item.id||item._id)}">Preview</a>
          <button class="btn btn-sm btn-danger btn-return" data-id="${esc(item.id||item._id)}">Kembalikan</button>
          <button class="btn btn-sm btn-success btn-forward" data-id="${esc(item.id||item._id)}" ${hasFile ? '' : 'disabled'} data-has-file="${hasFile}">Teruskan</button>
        </div>
      </td>
    `;
    return tr;
  }

  function render(list){
    const body = qs('list-body');
    if (!body) return;
    body.innerHTML = '';
    if (!list || list.length===0){
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="5" class="no-data">Tidak ada surat untuk diperiksa</td>';
      body.appendChild(tr); return;
    }
    list.forEach(it => body.appendChild(rowFor(it)));

    // Attach event listeners with logging
    console.log('🔌 Attaching event listeners for return buttons...');
    const returnButtons = body.querySelectorAll('.btn-return');
    console.log(`Found ${returnButtons.length} return buttons`);
    
    returnButtons.forEach(b => {
      b.addEventListener('click', async (e)=>{
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🔴 Return button clicked');
        const id = e.currentTarget.getAttribute('data-id');
        console.log('Item ID:', id);
      
      // Check if ConfirmModal is available
      if (typeof ConfirmModal === 'undefined' || !ConfirmModal) {
        console.error('ConfirmModal not loaded');
        if (!confirm('Kembalikan surat ke Tata Usaha?')) return;
        try {
          const note = prompt('Alasan pengembalian (wajib):');
          if (!note || note.trim().length < 5) {
            alert('Alasan pengembalian minimal 5 karakter');
            return;
          }
          await API.pengajuan.updateStatus(id, {
            status: 'disposisi_to_tatausaha',
            by: 'Sekretaris',
            note: note,
            to_role: 'tatausaha'
          });
          showToast('success', 'Surat berhasil dikembalikan ke Tata Usaha');
          loadAndRender();
        } catch(e) {
          console.error(e);
          showToast('error', 'Gagal mengembalikan surat');
        }
        return;
      }
      
      let item = null;
      try { item = await API.pengajuan.getById(id); } catch(e){}
      
      ConfirmModal.show({
        type: 'danger',
        icon: 'bi-arrow-return-left',
        title: 'Kembalikan Surat ke Tata Usaha',
        message: `Kembalikan surat <strong>${esc(item?.jenis || item?.type || 'ini')}</strong> ke Tata Usaha untuk perbaikan?`,
        detail: item ? {
          'Jenis Surat': item.jenis || item.type || '-',
          'Nama Pemohon': item.user_nama || item.pemohon_nama || item.nama || '-',
          'Tanggal': fmtDateTime(item.created_at || item.createdAt) || '-'
        } : null,
        showInput: true,
        inputLabel: 'Alasan Pengembalian (Wajib Diisi)',
        inputRequired: true,
        inputMinLength: 5,
        showWarning: true,
        warningText: 'Tata Usaha akan menerima catatan Anda dan melakukan perbaikan sebelum mengirim ulang.',
        confirmText: 'Ya, Kembalikan',
        cancelText: 'Batal',
        onConfirm: async (note) => {
          try {
            await API.pengajuan.updateStatus(id, {
                status: 'disposisi_to_tatausaha', // Return to TU
                by: 'Sekretaris',
                note: note,
                to_role: 'tatausaha'
            });
            showToast('success', 'Surat berhasil dikembalikan ke Tata Usaha');
            loadAndRender();
          } catch(e) {
            console.error(e);
            showToast('error', 'Gagal mengembalikan surat');
          }
        }
      });
      });
    });

    console.log('🔌 Attaching event listeners for forward buttons...');
    const forwardButtons = body.querySelectorAll('.btn-forward');
    console.log(`Found ${forwardButtons.length} forward buttons`);
    
    forwardButtons.forEach(b => {
      b.addEventListener('click', async (e)=>{
        e.preventDefault();
        e.stopPropagation();
        
        // Block forward if no file present
        if (b.getAttribute('data-has-file') === 'false' || b.hasAttribute('disabled')){
          showToast('warning', 'File surat belum diupload oleh Tata Usaha. Mohon kembalikan surat untuk perbaikan.');
          return;
        }
        
        console.log('🟢 Forward button clicked');
        const id = e.currentTarget.getAttribute('data-id');
        console.log('Item ID:', id);
      
      // Check if ConfirmModal is available
      if (typeof ConfirmModal === 'undefined' || !ConfirmModal) {
        console.error('ConfirmModal not loaded');
        if (!confirm('Teruskan surat ke Pendeta?')) return;
        try {
          const note = prompt('Catatan untuk Pendeta (opsional):') || '';
          await API.pengajuan.updateStatus(id, {
            status: 'disposisi_to_pendeta',
            by: 'Sekretaris',
            note: note,
            to_role: 'pendeta'
          });
          showToast('success', 'Surat berhasil diteruskan ke Pendeta');
          loadAndRender();
        } catch(e) {
          console.error(e);
          showToast('error', 'Gagal meneruskan surat');
        }
        return;
      }
      
      let item = null;
      try { item = await API.pengajuan.getById(id); } catch(e){}
      
      ConfirmModal.show({
        type: 'primary',
        icon: 'bi-send-fill',
        title: 'Teruskan ke Pendeta',
        message: `Teruskan surat <strong>${esc(item?.jenis || item?.type || 'ini')}</strong> ke Pendeta untuk validasi akhir?`,
        subMessage: 'Pendeta akan melakukan validasi final dan penerbitan nomor surat resmi.',
        detail: item ? {
          'Jenis Surat': item.jenis || item.type || '-',
          'Nama Pemohon': item.user_nama || item.pemohon_nama || item.nama || '-',
          'Tanggal': fmtDateTime(item.created_at || item.createdAt) || '-'
        } : null,
        showInput: true,
        inputLabel: 'Catatan untuk Pendeta (Opsional)',
        inputRequired: false,
        confirmText: 'Ya, Teruskan',
        cancelText: 'Batal',
        onConfirm: async (note) => {
          try {
            await API.pengajuan.updateStatus(id, {
                status: 'disposisi_to_pendeta',
                by: 'Sekretaris',
                note: note || '',
                to_role: 'pendeta'
            });
            // Also set validated_by_sekretaris flag if needed, but status change implies it
            showToast('success', 'Surat berhasil diteruskan ke Pendeta');
            loadAndRender();
          } catch(e) {
            console.error(e);
            showToast('error', 'Gagal meneruskan surat');
          }
        }
      });
      });
    });
    
    console.log('✅ All event listeners attached');
  }
  
  function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
    toast.style.cssText = 'z-index:9999;min-width:300px;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
    toast.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'}"></i>
        <span>${esc(message)}</span>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  async function loadAndRender(){
    let all = await loadList();
    const q = qs('search') ? qs('search').value.trim().toLowerCase() : '';
    
    if (q) {
        all = all.filter(i => 
            ((i.user_nama||i.pemohon_nama||i.nama||'').toLowerCase().includes(q)) || 
            ((i.jenis||i.type||'').toLowerCase().includes(q))
        );
    }
    render(all);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const search = qs('search');
    const btnRefresh = qs('btn-refresh');
    if (search) search.addEventListener('input', () => loadAndRender());
    if (btnRefresh) btnRefresh.addEventListener('click', () => loadAndRender());
    loadAndRender();
  });

})();
