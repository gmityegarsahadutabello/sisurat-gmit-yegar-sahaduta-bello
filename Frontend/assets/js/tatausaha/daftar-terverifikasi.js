// Tata Usaha - daftar-terverifikasi
(function(){
  function qs(id){ return document.getElementById(id); }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmtDateTime(ts){
    try {
      const d = new Date(ts);
      if (isNaN(d)) return '-';
      return d.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    } catch(e){ return ts || '-'; }
  }

  async function loadList(){
    let list = [];
    try {
        const all = await API.pengajuan.getAll();
        list = all.filter(i => {
          if (!i) return false;
          const status = String(i.status || '').toLowerCase();
          // Hanya tampilkan yang sudah diverifikasi koordinator TAPI belum validated final
          // Status 'diterima' is what Koordinator sets when verifying
          // Also include 'disposisi_to_tatausaha' (returned from Sekretaris/Pendeta)
          const isVerified = (status === 'diterima' || status === 'disposisi_to_tatausaha');
          
          return isVerified;
        });
    } catch(e) {
        console.error("Failed to load pengajuan", e);
        list = [];
    }
    return list;
  }

  function renderRow(item){
    const tr = document.createElement('tr');
    const waktu = fmtDateTime(item.created_at || item.createdAt || item.time || '');
    const jenis = item.jenis || item.type || 'Lainnya';
    const pengaju = item.user_nama || item.pemohon_nama || item.nama || item.pengaju || item.name || '-';
    
    // Check if file has been uploaded - check all possible structures
    const hasFile = !!(
      item.final_file_data || 
      item.final_file || 
      (item.files && item.files.final && item.files.final.data) ||
      item.final_file_url
    );
    const fileName = item.final_file_name || 
                     (item.files && item.files.final && item.files.final.name) || 
                     'File surat';
    const fileSize = item.final_file_size || 
                     (item.files && item.files.final && item.files.final.size) || 
                     0;
    
    // Status: Diproses (verified koordinator) atau Diterima (validated pendeta)
    const s = String(item.status || '').toLowerCase();
    let statusBadge = '<span class="badge bg-warning text-dark">Diproses</span>';
    if (s === 'disposisi_to_tatausaha') {
        statusBadge = '<span class="badge bg-danger">Dikembalikan</span>';
    }

    // Button disabled if no file uploaded
    const btnDisabled = hasFile ? '' : 'disabled';
    const btnClass = hasFile ? 'btn-success' : 'btn-secondary';
    const btnTitle = hasFile ? 'Kirim disposisi ke Sekretaris' : 'Upload file surat terlebih dahulu di Detail';

    tr.innerHTML = `
      <td data-label="Waktu">${escapeHtml(waktu)}</td>
      <td data-label="Jenis">${escapeHtml(jenis)}</td>
      <td data-label="Pengaju">${escapeHtml(pengaju)}</td>
      <td data-label="Status">${statusBadge}</td>
      <td data-label="Aksi">
        <div class="actions">
          <a class="btn btn-sm btn-outline-primary" href="detail-surat.html?id=${encodeURIComponent(item.id||item._id)}">Detail</a>
          <button class="btn btn-sm ${btnClass} btn-disposisi" 
                  data-id="${escapeHtml(item.id||item._id)}" 
                  data-has-file="${hasFile}" 
                  data-file-name="${escapeHtml(fileName)}" 
                  data-file-size="${fileSize}" 
                  ${btnDisabled} 
                  title="${btnTitle}">
            Disposisi
          </button>
        </div>
      </td>
    `;
    return tr;
  }

  function formatFileSize(bytes){
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  function showToast(type, message){
    const container = document.body;
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
    toast.style.cssText = 'z-index:9999;min-width:300px;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
    toast.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'info-circle-fill'}"></i>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function renderTable(list){
    const tbody = qs('list-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!list || list.length === 0){
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="5" class="no-data">Tidak ada data</td>';
      tbody.appendChild(tr);
      return;
    }
    list.forEach(item => tbody.appendChild(renderRow(item)));

    // wire disposisi buttons
    tbody.querySelectorAll('.btn-disposisi').forEach(b => {
      b.addEventListener('click', async (e) => {
        const btn = e.target;
        const id = btn.getAttribute('data-id');
        const hasFile = btn.getAttribute('data-has-file') === 'true';
        const fileName = btn.getAttribute('data-file-name') || 'File surat';
        const fileSize = parseInt(btn.getAttribute('data-file-size')) || 0;
        
        // Validation: file must be uploaded
        if (!hasFile){
          showToast('warning', 'Upload file surat terlebih dahulu di halaman Detail!');
          return;
        }
        
        // Show modern confirmation modal
        ConfirmModal.show({
          type: 'success',
          title: 'Konfirmasi Disposisi Surat',
          message: `
            <div style="margin-bottom: 16px;">
              <p style="margin: 0 0 12px 0; color: #084298; font-size: 1rem;">
                Anda akan mengirim surat ini ke <strong>Sekretaris</strong> untuk proses selanjutnya.
              </p>
              <p style="margin: 0; color: #6c757d; font-size: 0.9rem;">
                Pastikan file surat sudah benar sebelum mengirim disposisi.
              </p>
            </div>
            
            <div style="background: linear-gradient(135deg, #e7f3ff 0%, #cfe2ff 100%); padding: 14px 16px; border-radius: 8px; border: 2px solid #0d6efd; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <i class="bi bi-file-earmark-check" style="font-size: 1.2rem; color: #0d6efd;"></i>
                <strong style="color: #084298;">File yang akan dikirim:</strong>
              </div>
              <div style="padding-left: 30px;">
                <div style="color: #084298; font-weight: 600; margin-bottom: 4px;">${escapeHtml(fileName)}</div>
                <div style="color: #6c757d; font-size: 0.85rem;">Ukuran: ${formatFileSize(fileSize)}</div>
              </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%); padding: 12px 14px; border-radius: 8px; border: 2px solid #ffc107; display: flex; align-items: start; gap: 10px;">
              <i class="bi bi-exclamation-triangle-fill" style="font-size: 1.1rem; color: #856404; margin-top: 2px;"></i>
              <span style="color: #856404; font-size: 0.9rem; line-height: 1.5;">
                Setelah disposisi dikirim, surat akan diproses oleh Sekretaris dan tidak dapat dibatalkan.
              </span>
            </div>
          `,
          confirmText: 'Ya, Kirim Disposisi',
          cancelText: 'Batal',
          onConfirm: async () => {
            try {
                await API.pengajuan.updateStatus(id, {
                    status: 'disposisi_to_sekretaris',
                    by: 'Tata Usaha',
                    note: 'Dikirim oleh Tata Usaha',
                    to_role: 'sekretaris'
                });
                showToast('success', 'Disposisi berhasil dikirim ke Sekretaris!');
                loadAndRender();
            } catch(e) {
                console.error(e);
                showToast('error', 'Gagal mengirim disposisi');
            }
          }
        });
      });
    });
  }

  async function loadAndRender(){
    try{
      const all = await loadList();
      const q = qs('search') ? qs('search').value.trim().toLowerCase() : '';
      const type = qs('filter-type') ? qs('filter-type').value : '';
      let filtered = all;
      if (type) filtered = filtered.filter(i => (i.jenis||i.type||'').toLowerCase()===type.toLowerCase());
      if (q) filtered = filtered.filter(i => ((i.user_nama||i.pemohon_nama||i.nama||'')+ (i.nomor_surat||i.nomor||'') + (i.jenis||i.type||'')).toLowerCase().includes(q));
      renderTable(filtered);
    }catch(e){ console.error(e); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const search = qs('search');
    const filter = qs('filter-type');
    const btnRefresh = qs('btn-refresh');
    if (search) search.addEventListener('input', () => loadAndRender());
    if (filter) filter.addEventListener('change', () => loadAndRender());
    if (btnRefresh) btnRefresh.addEventListener('click', () => loadAndRender());
    loadAndRender();
  });

})();
