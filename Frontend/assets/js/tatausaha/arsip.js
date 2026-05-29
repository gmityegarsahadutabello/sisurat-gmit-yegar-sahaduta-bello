// Tata Usaha - arsip surat
(function(){
  function qs(id){ return document.getElementById(id); }
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function formatDate(dt){
    try {
      const d = new Date(dt);
      if (!isFinite(d)) return String(dt||'');
      return d.toLocaleString('id-ID', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch(e){ return String(dt||''); }
  }

  async function loadArsip(){
    // Use centralized LS helper if available
    if (typeof LS !== 'undefined' && LS.loadArray) {
      const all = await LS.loadArray('local_pengajuan') || [];
      return all.filter(i => {
        if (!i) return false;
        const status = String(i.status || '').toLowerCase();
        // Show items that are validated (final) or archived
        return (
          status === 'validated' || 
          status === 'archived' || 
          status === 'validated_by_pendeta' ||
          i.validated === true || 
          i.archived === true
        );
      });
    }
    return [];
  }

  function renderRow(item){
    const tr = document.createElement('tr');
    const tanggal = formatDate(item.validated_at || item.archived_at || item.last_updated || item.created_at || '');
    const nomor = escapeHtml(item.nomor_surat || item.nomor || item.number || '-');
    const jenis = escapeHtml(item.jenis || item.tipe || item.type || '-');
    
    // Improved logic to get penerima/pemohon name
    // Check multiple possible fields including form object
    let penerimaName = item.user_nama || item.pemohon_nama || item.nama || item.pengaju || item.penerima;
    
    // If not found, check inside form object (for different letter types)
    if (!penerimaName && item.form) {
      penerimaName = item.form.nama || item.form.nama_lengkap || item.form.nama_pemohon || item.form.nama_ayah || item.form.nama_calon_pria || item.form.nama_calon_wanita;
    }
    
    const penerima = escapeHtml(penerimaName || '-');
    
    // Determine file status
    const hasFile = !!(item.final_file || item.final_file_data);
    const fileName = item.final_file_name || 'surat.pdf';
    const fileUrl = item.final_file || item.final_file_data;
    
    tr.style.cssText = 'transition:all 0.2s ease;';
    tr.innerHTML = `
      <td data-label="Tanggal" style="padding:16px;vertical-align:middle;">
        <div style="display:flex;align-items:center;gap:8px;">
          <i class="bi bi-calendar-check" style="color:#6c757d;font-size:1.1rem;"></i>
          <span style="font-weight:500;">${tanggal}</span>
        </div>
      </td>
      <td data-label="Nomor / Jenis" style="padding:16px;vertical-align:middle;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <span style="font-weight:600;color:#0d6efd;">${nomor}</span>
          <span class="badge bg-secondary" style="width:fit-content;font-size:0.75rem;">${jenis}</span>
        </div>
      </td>
      <td data-label="Penerima" style="padding:16px;vertical-align:middle;">
        <div style="display:flex;align-items:center;gap:8px;">
          <i class="bi bi-person-circle" style="color:#6c757d;font-size:1.1rem;"></i>
          <span style="font-weight:500;">${penerima}</span>
        </div>
      </td>
      <td data-label="Status" style="padding:16px;vertical-align:middle;">
        <span class="badge bg-success" style="padding:6px 12px;">
          <i class="bi bi-check-circle-fill"></i> Selesai
        </span>
      </td>
      <td data-label="Aksi" style="padding:16px;vertical-align:middle;">
        <div class="d-flex gap-2">
          ${hasFile ? `
            <a class="btn btn-sm btn-primary" href="${fileUrl}" download="${fileName}" title="Download surat">
              <i class="bi bi-download"></i> Download
            </a>
          ` : ''}
          <a class="btn btn-sm btn-outline-secondary" href="detail-surat.html?id=${encodeURIComponent(item.id || item._id)}" title="Lihat detail">
            <i class="bi bi-eye"></i> Detail
          </a>
        </div>
      </td>
    `;
    return tr;
  }

  function applySortAndFilter(list, searchQuery, filterType, sortBy){
    let filtered = [...list];
    
    // Apply search filter
    if (searchQuery){
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => {
        const nomor = String(i.nomor_surat || i.nomor || i.number || '').toLowerCase();
        const jenis = String(i.jenis || i.tipe || i.type || '').toLowerCase();
        
        // Search penerima with same logic as display
        let penerimaName = i.user_nama || i.pemohon_nama || i.nama || i.pengaju || i.penerima;
        if (!penerimaName && i.form) {
          penerimaName = i.form.nama || i.form.nama_lengkap || i.form.nama_pemohon || i.form.nama_ayah || i.form.nama_calon_pria || i.form.nama_calon_wanita;
        }
        const penerima = String(penerimaName || '').toLowerCase();
        
        return nomor.includes(q) || jenis.includes(q) || penerima.includes(q);
      });
    }
    
    // Apply type filter
    if (filterType){
      filtered = filtered.filter(i => {
        const jenis = String(i.jenis || i.tipe || i.type || '').toLowerCase();
        return jenis === filterType.toLowerCase();
      });
    }
    
    // Apply sorting
    if (sortBy === 'newest'){
      filtered.sort((a, b) => {
        const dateA = new Date(a.validated_at || a.archived_at || a.last_updated || a.created_at || 0).getTime();
        const dateB = new Date(b.validated_at || b.archived_at || b.last_updated || b.created_at || 0).getTime();
        return dateB - dateA;
      });
    } else if (sortBy === 'oldest'){
      filtered.sort((a, b) => {
        const dateA = new Date(a.validated_at || a.archived_at || a.last_updated || a.created_at || 0).getTime();
        const dateB = new Date(b.validated_at || b.archived_at || b.last_updated || b.created_at || 0).getTime();
        return dateA - dateB;
      });
    } else if (sortBy === 'nomor'){
      filtered.sort((a, b) => {
        const nomorA = String(a.nomor_surat || a.nomor || a.number || '').toLowerCase();
        const nomorB = String(b.nomor_surat || b.nomor || b.number || '').toLowerCase();
        return nomorA.localeCompare(nomorB);
      });
    }
    
    return filtered;
  }

  async function renderTable(){
    const body = qs('arsip-body');
    const searchInput = qs('search');
    const filterType = qs('filter-type');
    const sortBy = qs('sort-by');
    const totalEl = qs('total-arsip');
    
    const allList = await loadArsip();
    const searchQuery = searchInput ? searchInput.value.trim() : '';
    const selectedType = filterType ? filterType.value : '';
    const selectedSort = sortBy ? sortBy.value : 'newest';
    
    const list = applySortAndFilter(allList, searchQuery, selectedType, selectedSort);
    
    // Update total count
    if (totalEl) totalEl.textContent = allList.length;
    
    if (body) {
      body.innerHTML = '';
      
      if (!list || list.length === 0){
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td colspan="5" style="padding:48px;text-align:center;">
            <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
              <i class="bi bi-inbox" style="font-size:3rem;color:#dee2e6;"></i>
              <div>
                <p style="margin:0;font-size:1.1rem;color:#6c757d;font-weight:600;">Tidak ada arsip ditemukan</p>
                <p style="margin:4px 0 0 0;font-size:0.9rem;color:#adb5bd;">
                  ${searchQuery || selectedType ? 'Coba ubah filter atau pencarian Anda' : 'Belum ada surat yang diarsipkan'}
                </p>
              </div>
            </div>
          </td>
        `;
        body.appendChild(tr);
        return;
      }
      
      list.forEach(it => body.appendChild(renderRow(it)));
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    renderTable();
    
    // Wire search input
    const searchInput = qs('search');
    if (searchInput){
      searchInput.addEventListener('input', () => renderTable());
    }
    
    // Wire filter select
    const filterType = qs('filter-type');
    if (filterType){
      filterType.addEventListener('change', () => renderTable());
    }
    
    // Wire sort select
    const sortBy = qs('sort-by');
    if (sortBy){
      sortBy.addEventListener('change', () => renderTable());
    }
    
    // Wire refresh button
    const btnRefresh = qs('btn-refresh');
    if (btnRefresh){
      btnRefresh.addEventListener('click', () => {
        // Reset filters
        if (searchInput) searchInput.value = '';
        if (filterType) filterType.value = '';
        if (sortBy) sortBy.value = 'newest';
        renderTable();
      });
    }
  });

})();
