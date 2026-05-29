// Surat Masuk page script
document.addEventListener('DOMContentLoaded', () => {
  const tableArea = document.getElementById('table-area');
  const loadingEl = document.getElementById('loading');
  const startEl = document.getElementById('start-date');
  const endEl = document.getElementById('end-date');
  const applyBtn = document.getElementById('apply-filter');
  const resetBtn = document.getElementById('reset-filter');

  let items = [];

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function getCurrentUser(){
    try {
      // Prefer localStorage, fallback to sessionStorage for older flows
      const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch(e){ return null; }
  }

  function isOwnerByNikOrId(item, user){
    if (!item || !user) return false;
    const nik = user.nik || user.id;
    if (!nik) return false;
    return (
      String(item.pemohon_nik||'') === String(nik) ||
      String(item.nik||'') === String(nik) ||
      String(item.user_nik||'') === String(nik) ||
      String(item.user_id||'') === String(nik)
    );
  }

  // On-demand fetch helper: fetch detail for given pengajuan id, obtain pre-signed `file_url`, then open it.
  // Exposed as `window.__fetchAndOpenFile` so the inline onclick can call it.
  window.__fetchAndOpenFile = async function(pengajuanId, btnEl) {
    if (!pengajuanId) return alert('Invalid pengajuan id');
    try {
      const btn = btnEl instanceof HTMLElement ? btnEl : null;
      const originalHtml = btn ? btn.innerHTML : null;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mengunduh...';
      }
      console.debug('fetchAndOpenFile: fetching pengajuan via API wrapper', pengajuanId);
      const json = await API.pengajuan.getById(pengajuanId);
      console.debug('fetchAndOpenFile: got detail', json && (json.file_url || json.final_file_url));
      const fileUrl = json && (json.file_url || json.final_file_url || json.file_url_final || json.downloadUrl || json.final_file || json.final_file_data);
      if (!fileUrl) throw new Error('Pre-signed URL tidak tersedia untuk surat ini. Silakan coba lagi atau hubungi admin.');

      // open in new tab to let browser handle download/preview
      window.open(fileUrl, '_blank');
    } catch (err) {
      console.error('Error fetching/opening file:', err);
      alert(err.message || 'Gagal mengunduh file.');
    } finally {
      if (btnEl && btnEl instanceof HTMLElement) {
        btnEl.disabled = false;
        btnEl.innerHTML = originalHtml || '<i class="bi bi-download"></i> Download';
      }
    }
  };

  function isFinished(item){
    const s = (item && item.status) ? String(item.status).toLowerCase().trim() : '';
    // Finished when final validated by Pendeta or archived. Be permissive with variations.
    if (item && (item.validated === true || item.validated_by_pendeta === true)) return true;
    if (!s) return false;
    if (s === 'validated' || s === 'archived') return true;
    if (s.indexOf('validated') !== -1) {
      // If status mentions pendeta or final, consider finished
      if (s.indexOf('pendeta') !== -1 || s.indexOf('final') !== -1 || s.indexOf('validated_by_pendeta') !== -1) return true;
      // generic 'validated' also acceptable
      return true;
    }
    // fallback: explicit token
    return s === 'validated_by_pendeta' || s === 'archived';
  }

  function canDownloadByJemaat(item){
    // Allow download when finished/validated or when a usable file URL/data exists and status looks acceptable
    if (!item) return false;
    // If backend explicitly marked downloadable URL, allow it when validated or if URL is public
    if (isFinished(item)) return true;
    // As a last resort, if there is a direct file URL and status is not explicitly blocking, allow
    const hasFileUrl = !!(item.final_file_url || item.file_url || item.final_file || item.final_file_data || item.downloadUrl);
    if (hasFileUrl) {
      // permit if status is not an in-progress or returned state
      const s = (item.status||'').toLowerCase();
      if (!s || (s.indexOf('disposisi') === -1 && s.indexOf('proses') === -1 && s.indexOf('ditolak') === -1)) return true;
    }
    return false;
  }

  function isRejected(item){
    const s = (item?.status||'').toLowerCase();
    return s === 'ditolak' || s === 'rejected';
  }

  function pickDisplayDate(item){
    return item.validated_at || item.verifiedAt || item.last_updated || item.createdAt || item.tanggal || item.created_at || null;
  }

  function formatDateTime(d) {
    if (!d) return '-';
    try { const dt = new Date(d); return dt.toLocaleDateString('id-ID') + ' ' + dt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); }
    catch(e){ return d; }
  }

  function render(list) {
    if (!list || list.length === 0) {
      tableArea.innerHTML = '<div class="no-data">Tidak ada surat masuk.</div>';
      return;
    }

    const rows = list.map((it, idx) => {
      // Ensure id field exists (MongoDB uses _id)
      const itemId = it.id || it._id || '';
      
      // final_file/final_file_data are usually dataURLs; use directly.
      // Also consider backend-generated presigned URLs `final_file_url` or `file_url` so the Download button is enabled.
      const downloadUrl = (canDownloadByJemaat(it) ? (it.final_file || it.final_file_data || it.downloadUrl || it.final_file_url || it.file_url) : null) || '#';
      const detailUrl = `pengajuan-detail.html?id=${encodeURIComponent(itemId)}`;
      const s = (it.status||'').toLowerCase();
      const statusBadge = s === 'ditolak'
        ? '<span class="badge bg-danger ms-2">Ditolak</span>'
        : (isFinished(it) ? '<span class="badge bg-success ms-2">Selesai</span>' : '');
      
      console.log('🔍 Rendering item:', { id: itemId, status: it.status, jenis: it.jenis || it.type });
      
      return `
      <tr>
        <td style="width:60px;font-weight:600;">${idx+1}</td>
        <td>
          <div class="fw-semibold">${escapeHtml(it.jenis || it.type || it.nama || 'Surat')}${statusBadge}</div>
          <small class="text-muted">No: ${escapeHtml(it.nomor || itemId || '-')}</small>
        </td>
        <td>
          <div>${escapeHtml(it.pemohon_nama || it.pengaju || it.pemohon || it.user_nama || '-')}</div>
          <small class="text-muted"><i class="bi bi-calendar3 me-1"></i>${formatDateTime(pickDisplayDate(it))}</small>
        </td>
        <td class="table-actions" style="width:120px">
          <a class="btn btn-sm btn-primary" href="${detailUrl}" title="Lihat Detail">
            <i class="bi bi-eye"></i> Lihat
          </a>
        </td>
      </tr>
    `;
    }).join('');

    tableArea.innerHTML = `
      <table class="table table-hover">
        <thead>
          <tr>
            <th style="width:60px;">No</th>
            <th>Jenis Surat</th>
            <th>Pemohon & Tanggal</th>
            <th style="width:180px;">Aksi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function applyFilter() {
    const start = startEl.value ? new Date(startEl.value) : null;
    const end = endEl.value ? new Date(endEl.value) : null;
    const filtered = items.filter(it => {
      const pick = pickDisplayDate(it);
      const t = pick ? new Date(pick) : null;
      if (start && t && t < start) return false;
      if (end && t) { const ed = new Date(end); ed.setHours(23,59,59,999); if (t > ed) return false; }
      return true;
    });
    render(filtered);
  }

  async function load() {
    loadingEl && (loadingEl.textContent = 'Memuat surat masuk...');
    try {
      const currentUser = getCurrentUser();
      if (currentUser) {
          // Get all submissions for this user via API
          // Note: API.pengajuan.getAll returns array directly
          const userId = currentUser.id || currentUser.nik || currentUser._id;
          const allItems = await API.pengajuan.getAll({ user_id: userId });
          
          console.log('🔍 DEBUG Surat Masuk - Current User:', { id: userId, nik: currentUser.nik });
          console.log('🔍 DEBUG Surat Masuk - Total items from API:', allItems?.length);
          console.log('🔍 DEBUG Surat Masuk - Items detail:', allItems?.map(i => ({ 
            id: i._id?.toString(), 
            status: i.status, 
            type: i.type,
            user_id: i.user_id 
          })));
          
          // Filter: Hanya surat yang SELESAI atau DITOLAK (tidak termasuk yang sedang diproses)
          items = (allItems || []).filter(it => {
            const isOwner = isOwnerByNikOrId(it, currentUser);
            const s = (it.status || '').toLowerCase();
            
            // Surat masuk = selesai divalidasi oleh pendeta ATAU ditolak
            const isFinishedOrRejected = 
              s === 'validated_by_pendeta' || 
              s === 'validated' || 
              s === 'archived' || 
              s === 'ditolak' || 
              s === 'rejected' ||
              s === 'rejected_by_koor';
            
            return isOwner && isFinishedOrRejected;
          });
          
          console.log('🔍 DEBUG Surat Masuk - After filter (finished/rejected only):', items?.length);
      } else {
          items = [];
      }
    } catch (err) {
      console.error('Error loading surat masuk:', err);
      items = [];
    }
    
    // Sort descending by date
    if (items && items.length > 0) {
        items.sort((a, b) => {
          const dateA = new Date(pickDisplayDate(a) || 0);
          const dateB = new Date(pickDisplayDate(b) || 0);
          return dateB - dateA;
        });
    }

    loadingEl && (loadingEl.textContent = '');
    render(items);
  }

  // Set default tanggal: 1 bulan ke belakang sampai besok
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];
  
  if (startEl) startEl.value = oneMonthAgoStr;
  if (endEl) endEl.value = tomorrowStr;

  applyBtn.addEventListener('click', applyFilter);
  resetBtn.addEventListener('click', () => { 
    // Reset ke default: 1 bulan ke belakang sampai besok
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    startEl.value = oneMonthAgo.toISOString().split('T')[0];
    endEl.value = tomorrow.toISOString().split('T')[0];
    render(items); 
  });

  load();
});
