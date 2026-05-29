// Daftar Pengajuan JS
document.addEventListener('DOMContentLoaded', () => {
  const tableArea = document.getElementById('table-area');
  const loadingEl = document.getElementById('loading');
  const startEl = document.getElementById('filter-start');
  const endEl = document.getElementById('filter-end');
  const statusEl = document.getElementById('filter-status');
  const qEl = document.getElementById('filter-q');
  const applyBtn = document.getElementById('filter-apply');
  const resetBtn = document.getElementById('filter-reset');
  const resultInfo = document.getElementById('result-info');

  let items = [];
  let sortKey = 'tanggal';
  let sortDir = 'desc';

  // Get current logged-in user
  function getCurrentUser() {
    try {
      const userStr = localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      console.error('Error getting current user:', e);
      return null;
    }
  }

  function isOwner(item, user){
    if (!item || !user) return false;
    const userId = user.id || null; // for jemaat, this equals NIK
    const userNik = user.nik || userId || null;
    const userEmail = user.email || null;
    // Accept multiple fields to be safe across legacy/new data
    const candidates = [
      item.user_id, item.user_nik, item.pemohon_nik, item.nik,
      item.user_email, item.email
    ].map(v => v == null ? null : String(v));

    return (
      (userId && candidates.includes(String(userId))) ||
      (userNik && candidates.includes(String(userNik))) ||
      (userEmail && candidates.includes(String(userEmail)))
    );
  }

  // Helper: determine item state (raw item)
  function isRejected(item){
    const s = (item?.status || '').toLowerCase();
    return s === 'ditolak' || s === 'rejected';
  }

  function isFinished(item){
    const s = (item?.status || '').toLowerCase();
    // For Jemaat view: finished ONLY when validated by pendeta or archived
    return s === 'validated_by_pendeta' ||
           s === 'validated' ||
           s === 'archived';
  }

  function isInProcess(item){
    return !isRejected(item) && !isFinished(item);
  }

  function formatDate(d) {
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
        + '\n' + dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) { return d; }
  }

  function statusBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'ditolak' || s === 'rejected') return '<span class="badge badge-status-ditolak"><i class="bi bi-x-circle-fill me-1"></i>Ditolak</span>';
    if (s === 'validated_by_pendeta' || s === 'validated' || s === 'archived') return '<span class="badge badge-status-diterima"><i class="bi bi-check2-circle me-1"></i>Selesai</span>';
    // semua status lain = sedang diproses (termasuk diterima koordinator, di TU, sekretaris, pendeta)
    return '<span class="badge badge-status-proses"><i class="bi bi-hourglass-split me-1"></i>Diproses</span>';
  }

  function renderTable(list) {
    if (!list || list.length === 0) {
      tableArea.innerHTML = '<div class="no-data"><div class="big mb-1">Belum ada pengajuan</div><div class="mb-3">Pengajuan Anda akan tampil di sini setelah dibuat.</div><a class="btn btn-primary" href="pengajuan.html"><i class="bi bi-plus-circle me-1"></i> Ajukan Surat</a></div>';
      if (resultInfo) resultInfo.textContent = '0 hasil';
      return;
    }

    // sort
    const sorted = list.slice().sort((a,b) => {
      const ka = (a[sortKey] || '').toString().toLowerCase();
      const kb = (b[sortKey] || '').toString().toLowerCase();
      if (sortKey === 'tanggal') {
        const ta = new Date(a.tanggal || a.createdAt || 0).getTime();
        const tb = new Date(b.tanggal || b.createdAt || 0).getTime();
        return sortDir === 'asc' ? (ta - tb) : (tb - ta);
      }
      if (ka < kb) return sortDir === 'asc' ? -1 : 1;
      if (ka > kb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const rows = sorted.map((it, idx) => {
      return `
        <tr>
          <td style="vertical-align: middle;">${idx + 1}</td>
          <td style="vertical-align: middle;">${escapeHtml(it.jenis || it.type || '—')}</td>
          <td style="vertical-align: middle; white-space: pre-line;">${escapeHtml(it.perihal || '—')}</td>
          <td style="vertical-align: middle; white-space: pre-line;">${formatDate(it.tanggal || it.createdAt || '')}</td>
          <td style="vertical-align: middle;">${statusBadge(it.status)}</td>
          <td class="table-actions" style="vertical-align: middle;">
            <button class="btn btn-sm btn-primary btn-view" data-id="${it.id}"><i class="bi bi-eye"></i> <span>Lihat</span></button>
            <button class="btn btn-sm btn-outline-secondary btn-track" data-id="${it.id}"><i class="bi bi-graph-up"></i> <span>Lacak</span></button>
          </td>
        </tr>`;
    }).join('');

    tableArea.innerHTML = `
      <table class="table table-borderless">
        <thead class="text-muted small">
          <tr>
            <th style="width:60px">No</th>
            <th class="sortable ${sortKey==='jenis' ? ('sorted-'+sortDir) : ''}" data-key="jenis">Jenis Surat <span class="sort-ind"></span></th>
            <th class="sortable ${sortKey==='perihal' ? ('sorted-'+sortDir) : ''}" data-key="perihal" style="width:280px">Perihal Surat <span class="sort-ind"></span></th>
            <th class="sortable ${sortKey==='tanggal' ? ('sorted-'+sortDir) : ''}" data-key="tanggal" style="width:220px">Tanggal Pengajuan <span class="sort-ind"></span></th>
            <th class="sortable ${sortKey==='status' ? ('sorted-'+sortDir) : ''}" data-key="status" style="width:140px">Status <span class="sort-ind"></span></th>
            <th style="width:160px">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>`;

    // result info
    if (resultInfo) resultInfo.textContent = `${sorted.length} hasil`;

    // wire buttons
    tableArea.querySelectorAll('.btn-view').forEach(b => b.addEventListener('click', (e) => {
      const id = b.getAttribute('data-id');
      if (id) window.location.href = `pengajuan-detail.html?id=${encodeURIComponent(id)}`;
    }));

    tableArea.querySelectorAll('.btn-track').forEach(b => b.addEventListener('click', (e) => {
      const id = b.getAttribute('data-id');
      openTrackModal(id);
    }));

    // wire sorting
    tableArea.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-key');
        if (sortKey === key) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          sortDir = key === 'tanggal' ? 'desc' : 'asc';
        }
        renderTable(list);
      });
    });
  }

  function applyFilters() {
    const start = startEl.value ? new Date(startEl.value) : null;
    const end = endEl.value ? new Date(endEl.value) : null;
    const status = statusEl.value; // all/proses/diterima/ditolak
    const q = (qEl && qEl.value ? qEl.value.trim().toLowerCase() : '');

    const filtered = items.filter(it => {
      let ok = true;
      const t = it.tanggal ? new Date(it.tanggal) : (it.createdAt ? new Date(it.createdAt) : null);
      if (start && t) ok = ok && (t >= start);
      if (end && t) {
        const endDay = new Date(end); endDay.setHours(23,59,59,999);
        ok = ok && (t <= endDay);
      }
      if (status !== 'all') {
        // Semantic filter:
        // - proses  : semua status yang belum final & bukan ditolak
        // - diterima: final (validated_by_pendeta|validated|archived)
        // - ditolak : ditolak/rejected
        const sTarget = status.toLowerCase();
        const base = it.raw || it;
        if (sTarget === 'proses') ok = ok && isInProcess(base);
        else if (sTarget === 'diterima') ok = ok && isFinished(base);
        else if (sTarget === 'ditolak') ok = ok && isRejected(base);
        else {
          const s = (it.status || '').toLowerCase();
          ok = ok && (s === sTarget);
        }
      }
      if (q) {
        const hay = `${(it.jenis||'').toString().toLowerCase()} ${(it.perihal||'').toString().toLowerCase()}`;
        ok = ok && hay.includes(q);
      }
      return ok;
    });

    renderTable(filtered);
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  async function loadData() {
    renderSkeleton();
    try {
      // Get current user
      const currentUser = getCurrentUser();
      if (!currentUser) {
        console.error('❌ No current user found!');
        items = [];
        applyFilters();
        return;
      }
      
      // Use API client to fetch data with user_id parameter
      const userId = currentUser.id || currentUser.nik || currentUser._id;
      console.log('🔍 DEBUG - Fetching for user_id:', userId);
      
      items = await API.pengajuan.getAll({ user_id: userId }) || [];
      console.log('🔍 DEBUG - Total pengajuan from API:', items.length);
      
      // Backend already filtered by user_id, so we don't need to filter again
      // Just log for debugging
      if (items.length > 0) {
        console.log('🔍 DEBUG - Sample pengajuan:', {
          id: items[0].id || items[0]._id,
          type: items[0].type,
          status: items[0].status,
          user_nik: items[0].user_nik
        });
      }
    } catch (err) {
      console.error('Error loading pengajuan:', err);
      items = [];
    }

    // normalize items: ensure id, jenis, status, tanggal, perihal (previously 'akademik')
    items = (items || []).map(it => {
       // Flatten form data if exists (for perihal, etc that are inside form object)
       const flatData = it.form && typeof it.form === 'object' ? { ...it, ...it.form } : it;
       
       return {
         id: it.id || it._id || it.kode || '',
         type: it.type || it.tipe || it.jenis || it.jenisSurat || '',
         jenis: it.jenis || it.type || `Tipe Surat ${it.type || '?'}`,
         status: (it.status || it.sts || 'Proses'), // status is at root level, not in form
         tanggal: it.tanggal || it.createdAt || it.created_at || '' ,
         perihal: flatData.perihal || flatData.perihalSurat || flatData.judul || flatData.subject || flatData.type || '',
         raw: it
       };
     });

    console.log('🔍 DEBUG - Normalized items:', items.length);
    applyFilters();
  }

  function renderSkeleton(){
    const skelRow = () => `
      <tr class="skeleton-row">
        <td><span class="skeleton" style="width:28px;height:12px"></span></td>
        <td><span class="skeleton" style="width:140px"></span></td>
        <td><span class="skeleton" style="width:220px"></span></td>
        <td><span class="skeleton" style="width:160px"></span></td>
        <td><span class="skeleton" style="width:90px"></span></td>
        <td><span class="skeleton" style="width:120px"></span></td>
      </tr>`;
    tableArea.innerHTML = `
      <table class="table table-borderless">
        <thead class="text-muted small">
          <tr>
            <th style="width:60px">No</th>
            <th>Jenis Surat</th>
            <th style="width:280px">Perihal Surat</th>
            <th style="width:220px">Tanggal Pengajuan</th>
            <th style="width:140px">Status</th>
            <th style="width:160px">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${skelRow()}${skelRow()}${skelRow()}${skelRow()}${skelRow()}
        </tbody>
      </table>`;
    if (resultInfo) resultInfo.textContent = '';
  }

  async function openTrackModal(id) {
    const modalEl = document.getElementById('trackModal');
    const bodyEl = document.getElementById('track-body');
    bodyEl.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary" role="status"></div><span class="ms-2">Memuat riwayat...</span></div>';
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    try {
      // Read directly from localStorage for realtime tracking
      const allItems = await LS.loadArray('local_pengajuan') || [];
      const item = allItems.find(x => x && String(x.id) === String(id));
      
      if (!item) {
        bodyEl.innerHTML = '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>Item tidak ditemukan.</div>';
        return;
      }

      // Get timeline from item (prefer timeline over history)
      const timeline = item.timeline || item.history || [];
      
      if (!timeline || timeline.length === 0) {
        bodyEl.innerHTML = '<div class="text-muted text-center py-4"><i class="bi bi-clock-history" style="font-size:2rem;"></i><p class="mt-2 mb-0">Belum ada riwayat untuk pengajuan ini.</p></div>';
        return;
      }

      // Sort timeline by time (newest first)
      const sorted = timeline.slice().sort((a,b) => {
        const tA = new Date(a.at || a.time || a.tanggal || 0).getTime();
        const tB = new Date(b.at || b.time || b.tanggal || 0).getTime();
        return tB - tA;
      });

      // Action labels mapping
      const actionLabels = {
        'proses': '📝 Pengajuan dibuat',
        'diterima': '✅ Diverifikasi oleh Koordinator',
        'ditolak': '❌ Ditolak oleh Koordinator',
        'nomor_assigned': '🔢 Nomor surat diterbitkan',
        'file_uploaded': '📎 File surat diunggah',
        'disposisi_to_sekretaris': '📤 Diteruskan ke Sekretaris',
        'disposisi_to_pendeta': '📤 Diteruskan ke Pendeta',
        'disposisi_to_tatausaha': '📥 Dikembalikan ke Tata Usaha',
        'validated_by_sekretaris': '✅ Divalidasi oleh Sekretaris',
        'validated_by_pendeta': '✅ Divalidasi oleh Pendeta',
        'validated': '✅ Surat selesai divalidasi',
        'archived': '📦 Surat diarsipkan'
      };

      const roleNames = {
        'jemaat': 'Jemaat',
        'koordinator': 'Koordinator Rayon',
        'tatausaha': 'Tata Usaha',
        'sekretaris': 'Sekretaris',
        'pendeta': 'Pendeta'
      };

      const itemsHtml = sorted.map((h, idx) => {
        const action = h.action || h.status || 'update';
        const label = actionLabels[action] || action;
        const time = formatDate(h.at || h.time || h.tanggal || h.createdAt);
        const by = h.by ? roleNames[h.by.toLowerCase()] || h.by : '';
        const note = h.note || h.keterangan || '';
        const isRejection = action === 'ditolak' || action === 'disposisi_to_tatausaha';
        
        return `
        <div class="timeline-item mb-3" style="border-left:3px solid ${isRejection ? '#dc3545' : '#0d6efd'};padding-left:16px;position:relative;">
          <div style="position:absolute;left:-8px;top:6px;width:14px;height:14px;border-radius:50%;background:${isRejection ? '#dc3545' : '#0d6efd'};"></div>
          <div class="d-flex justify-content-between align-items-start mb-1">
            <div class="fw-semibold" style="color:${isRejection ? '#dc3545' : '#2d3748'};">${escapeHtml(label)}</div>
            ${by ? `<span class="badge bg-${isRejection ? 'danger' : 'primary'}" style="font-size:0.7rem;">${escapeHtml(by)}</span>` : ''}
          </div>
          <div class="small text-muted mb-1"><i class="bi bi-clock"></i> ${escapeHtml(time)}</div>
          ${note ? `<div class="small" style="background:${isRejection ? '#fff5f5' : '#f8f9fa'};padding:8px 10px;border-radius:6px;margin-top:6px;border-left:3px solid ${isRejection ? '#dc3545' : '#0d6efd'};"><strong style="color:#666;">💬 Catatan:</strong><div style="color:#2d3748;margin-top:4px;white-space:pre-wrap;">${escapeHtml(note)}</div></div>` : ''}
        </div>
        `;
      }).join('');

      bodyEl.innerHTML = `<div class="timeline-container">${itemsHtml}</div>`;
    } catch (err) {
      console.error('Error loading timeline:', err);
      bodyEl.innerHTML = '<div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i>Gagal memuat riwayat. Silakan coba lagi.</div>';
    }
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

  applyBtn.addEventListener('click', applyFilters);
  resetBtn.addEventListener('click', () => { 
    // Reset ke default: 1 bulan ke belakang sampai besok
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    if(startEl) startEl.value = oneMonthAgo.toISOString().split('T')[0];
    if(endEl) endEl.value = tomorrow.toISOString().split('T')[0];
    if(statusEl) statusEl.value = 'proses'; 
    if(qEl) qEl.value = ''; 
    applyFilters(); 
  });

  // Live search (debounced)
  function debounce(fn, wait){ let t; return function(){ clearTimeout(t); t = setTimeout(() => fn.apply(this, arguments), wait); }; }
  if (qEl) qEl.addEventListener('input', debounce(applyFilters, 180));

  // Default status filter to 'proses' for Jemaat
  if (statusEl) { statusEl.value = 'proses'; }

  loadData();
});
