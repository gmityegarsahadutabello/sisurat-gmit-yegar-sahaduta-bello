// Tata Usaha - daftar disposisi (surat yang telah diupload dan diteruskan ke sekretaris/pendeta)
(function(){
  const qs = id => document.getElementById(id);

  async function loadList(){
    let all = [];
    try {
        all = await API.pengajuan.getAll();
    } catch(e) {
        console.error("Failed to load pengajuan", e);
        all = [];
    }
    
    // Show disposisi in-process (sent to sekretaris/pendeta) AND returned (disposisi_to_tatausaha)
    // IMPORTANT: Exclude validated/archived items (sudah selesai)
    return all.filter(i => {
      if (!i) return false;
      const status = String(i.status || '').toLowerCase();
      const isDisposisi = (
        status === 'disposisi_to_sekretaris' || 
        status === 'disposisi_to_pendeta' || 
        status === 'disposisi_to_tatausaha'
      );
      const hasFile = (i.final_file || (i.files && i.files.final) || i.final_file_url || i.draft_surat);
      const isCompleted = (
        status === 'validated' || 
        status === 'archived' || 
        status === 'validated_by_pendeta' ||
        status === 'surat_dibuat' ||
        i.validated === true || 
        i.archived === true || 
        i.validated_by_pendeta === true
      );
      return isDisposisi && hasFile && !isCompleted;
    });
  }

  function renderRow(item, idx){
    const tr = document.createElement('tr');
    const isReturned = item.status === 'disposisi_to_tatausaha';
    
    // Get return info if returned
    let statusDisplay = escapeHtml(item.status||'—');
    let returnedByInfo = '';
    
    if (isReturned) {
      const timeline = (item.timeline || item.history || []).filter(Boolean);
      // Find the latest entry with action 'disposisi_to_tatausaha'
      function tms(v){ try{ return new Date(v).getTime()||0; }catch(e){ return 0; } }
      const sorted = timeline.slice().sort((a,b)=> tms(b.at||b.time||b.tanggal) - tms(a.at||a.time||a.tanggal));
      const returnEntry = sorted.find(e => e && e.action === 'disposisi_to_tatausaha');
      const returnedBy = returnEntry && returnEntry.by ? returnEntry.by : '';
      
      // Friendly role name
      const roleNames = {
        'sekretaris': 'Sekretaris',
        'pendeta': 'Pendeta',
        'tatausaha': 'Tata Usaha',
        'koordinator': 'Koordinator'
      };
      const friendlyRole = roleNames[(returnedBy||'').toLowerCase()] || returnedBy;
      
      statusDisplay = `
        <div style="display:flex;align-items:center;gap:6px;">
          <i class="bi bi-arrow-return-left" style="color:#dc3545;"></i>
          <span style="color:#dc3545;font-weight:bold;">Dikembalikan</span>
        </div>
      `;
      
      if (friendlyRole) {
        returnedByInfo = `<small style="color:#666;display:block;margin-top:2px;">oleh ${escapeHtml(friendlyRole)}</small>`;
      }
    }
    
    const finalFile = item.final_file || (item.files && item.files.final) || item.final_file_url;

    tr.innerHTML = `
      <td data-label="No">${idx+1}</td>
      <td data-label="Nomor">${escapeHtml(item.nomor_surat||item.nomor||item.no||'—')}</td>
      <td data-label="Tipe">${escapeHtml(item.jenis||item.type||'—')}</td>
      <td data-label="Pengaju">${escapeHtml(item.user_nama||item.pemohon_nama||item.nama||item.pengaju||'—')}</td>
      <td data-label="Status">${statusDisplay}${returnedByInfo}</td>
      <td data-label="Aksi">
        <div class="btn-group btn-group-sm">
          <a class="btn btn-outline-primary" href="detail-surat.html?id=${encodeURIComponent(item.id||item._id)}">Detail</a>
          <button type="button" class="btn btn-outline-info btn-track" data-id="${String(item.id||item._id)}">Lacak</button>
        </div>
      </td>
    `;
    
    // Highlight returned items with gradient
    if (isReturned) {
      tr.style.background = 'linear-gradient(90deg, #fff5f5 0%, #ffffff 100%)';
      tr.style.borderLeft = '4px solid #dc3545';
    }
    
    return tr;
  }

  function render(list){
    const tbody = qs('disposisi-tbody');
    const noData = qs('no-data');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!list || !list.length){ if (noData) noData.style.display = 'block'; return; }
    if (noData) noData.style.display = 'none';
    list.forEach((it,i) => tbody.appendChild(renderRow(it,i)));
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function formatDate(dt){
    try {
      const d = new Date(dt);
      if (!isFinite(d)) return String(dt||'');
      return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    } catch(e){ return String(dt||''); }
  }

  function getEventIcon(status){
    if (/pengajuan|dibuat|created/i.test(status)) return '📝';
    if (/upload|file/i.test(status)) return '📎';
    if (/disposisi|dikirim/i.test(status)) return '📤';
    if (/sekretaris/i.test(status)) return '👔';
    if (/pendeta/i.test(status)) return '⛪';
    if (/koordinator/i.test(status)) return '📋';
    if (/validated|selesai/i.test(status)) return '✅';
    if (/ditolak|rejected/i.test(status)) return '❌';
    return '🔵';
  }

  function getEventBadgeClass(status){
    if (/validated|selesai/i.test(status)) return 'badge-primary';
    if (/verified|diterima|approved/i.test(status)) return 'badge-success';
    if (/ditolak|rejected|kembali/i.test(status)) return 'badge-danger';
    if (/disposisi|dikirim/i.test(status)) return 'badge-info';
    return 'badge-secondary';
  }

  function friendlyRoleName(role){
    if (!role) return '';
    const map = {
      'sekretaris': 'Sekretaris',
      'pendeta': 'Pendeta',
      'tatausaha': 'Tata Usaha',
      'koordinator': 'Koordinator',
      'jemaat': 'Jemaat'
    };
    const key = String(role).toLowerCase();
    return map[key] || role;
  }

  function friendlyActionLabel(action){
    if (!action) return '-';
    const key = String(action).toLowerCase();
    const map = {
      'submitted': 'Surat diajukan',
      'proses': 'Surat dibuat',
      'verified': 'Disetujui',
      'diterima': 'Diterima',
      'disposisi_to_sekretaris': 'Diteruskan ke Sekretaris',
      'disposisi_to_pendeta': 'Diteruskan ke Pendeta',
      'disposisi_to_tatausaha': 'Dikembalikan ke Tata Usaha',
      'file_uploaded': 'File diunggah',
      'draft_saved': 'Draft disimpan',
      'validated': 'Validasi final',
      'ditolak': 'Ditolak'
    };
    return map[key] || action;
  }

  function statusPillClass(action){
    const badge = getEventBadgeClass(action || '');
    const map = {
      'badge-primary': 'status-pill status-pill-primary',
      'badge-success': 'status-pill status-pill-success',
      'badge-danger': 'status-pill status-pill-danger',
      'badge-info': 'status-pill status-pill-info'
    };
    return map[badge] || 'status-pill status-pill-neutral';
  }

  function timeValue(entry){
    if (!entry) return 0;
    const raw = entry.at || entry.time || entry.timestamp || entry.date || entry.tanggal;
    const d = raw ? new Date(raw) : null;
    return d && isFinite(d) ? d.getTime() : 0;
  }

  function openTimelineModal(item){
    const container = document.getElementById('timeline-content');
    if (!container) return;
    
    // Clear previous content first
    container.innerHTML = '';
    
    const titleEl = document.getElementById('timeline-title');
    if (titleEl){
      const tipe = item.jenis || item.type || '';
      const nomor = item.nomor_surat || item.nomor || item.no || '—';
      titleEl.textContent = `Lacak Surat ${tipe ? `(${tipe})` : ''} — No: ${nomor}`;
    }

    const history = (item.timeline || item.history || item.logs || []).filter(Boolean);
    if (!history.length){
      container.innerHTML = `
        <div class="timeline-empty-state">
          <div class="empty-illustration"><i class="bi bi-inbox"></i></div>
          <h6>Belum ada riwayat</h6>
          <p>Surat ini belum memiliki aktivitas yang tercatat.</p>
        </div>`;
    } else {
      const sorted = history.slice().sort((a,b) => timeValue(a) - timeValue(b));
      const last = sorted[sorted.length - 1];
      const infoBar = `
        <div class="timeline-info-bar">
          <div class="info-block">
            <span class="info-label">Status saat ini</span>
            <div class="${statusPillClass(item.status || last?.action)}">
              <i class="bi bi-activity"></i>
              <span>${escapeHtml(friendlyActionLabel(item.status || last?.action))}</span>
            </div>
          </div>
          <div class="info-block">
            <span class="info-label">Total aktivitas</span>
            <div class="info-value">${sorted.length} langkah</div>
          </div>
          <div class="info-block">
            <span class="info-label">Terakhir diperbarui</span>
            <div class="info-value">${escapeHtml(formatDate(last?.at || last?.time || last?.timestamp || last?.date || last?.tanggal || item.updated_at || item.created_at))}</div>
          </div>
        </div>`;

      const listItems = sorted.map((entry, idx) => {
        const status = entry.action || entry.status || entry.event || '-';
        const badge = getEventBadgeClass(status);
        const icon = getEventIcon(status);
        const by = friendlyRoleName(entry.by || entry.user || entry.role);
        const note = entry.note || entry.keterangan || entry.message || '';
        const time = entry.at || entry.time || entry.timestamp || entry.date || entry.tanggal;
        const isLast = idx === sorted.length - 1;
        return `
          <li class="timeline-item ${isLast ? 'timeline-item-last' : ''}">
            <div class="timeline-marker"><span class="timeline-icon">${icon}</span></div>
            <div class="timeline-content">
              <div class="timeline-card">
                <div class="timeline-header">
                  <span class="timeline-step">Langkah ${idx + 1}</span>
                  <span class="timeline-time"><i class="bi bi-clock"></i> ${escapeHtml(formatDate(time))}</span>
                </div>
                <div class="timeline-status-row">
                  <span class="timeline-badge ${badge}">${escapeHtml(friendlyActionLabel(status))}</span>
                  ${by ? `<span class="timeline-role-chip"><i class="bi bi-person-badge"></i> ${escapeHtml(by)}</span>` : ''}
                </div>
                ${note ? `<div class="timeline-note"><i class="bi bi-chat-left-text"></i><div><strong>Catatan</strong><p>${escapeHtml(note)}</p></div></div>` : ''}
              </div>
            </div>
          </li>`;
      }).join('');

      container.innerHTML = `
        <div class="timeline-modal-body">
          ${infoBar}
          <div class="timeline-scroll">
            <div class="timeline-wrapper">
              <ul class="list-unstyled timeline-list">
                ${listItems}
              </ul>
            </div>
          </div>
          <div class="timeline-hint"><i class="bi bi-mouse"></i> Gulir ke bawah untuk melihat riwayat lainnya.</div>
        </div>`;
    }

    if (window.bootstrap && window.bootstrap.Modal){
      const modalEl = document.getElementById('timelineModal');
      // Dispose any existing modal instance first
      const existingModal = bootstrap.Modal.getInstance(modalEl);
      if (existingModal) {
        existingModal.dispose();
      }
      // Create new modal instance and show
      const modal = new bootstrap.Modal(modalEl, {
        backdrop: true,
        keyboard: true,
        focus: true
      });
      modal.show();
    } else {
      alert('Timeline tidak dapat dibuka (Bootstrap belum dimuat).');
    }
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    render(await loadList());
    // window.addEventListener('storage', async ()=> render(await loadList()));

    const tbody = qs('disposisi-tbody');
    if (tbody){
      tbody.addEventListener('click', async (event) => {
        const trackBtn = event.target && event.target.closest('.btn-track');
        if (trackBtn) {
          const id = trackBtn.getAttribute('data-id');
          let current = null;
          try { current = await API.pengajuan.getById(id); } catch(e){ console.error(e); }
          if (current) openTimelineModal(current);
          return;
        }

        // Note: Download removed from list; downloads are available from the detail page only.
      });
    }
  });

})();
