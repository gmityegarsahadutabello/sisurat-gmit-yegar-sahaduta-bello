/*
  Daftar Diverifikasi (Koordinator)
  - Render tabel terverifikasi/ditolak
  - Modal detail, verifikasi, penolakan, timeline
  - Uses API helper
*/

(function() {
  // helpers
  function $(sel){ return document.querySelector(sel); }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
  function fmtDateTime(ts){
    try {
      const d = new Date(ts);
      if (isNaN(d)) return '-';
      return d.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    } catch(e){ return ts || '-'; }
  }
  
  function getRayon() {
    return sessionStorage.getItem('rayon') || ( (() => { try { const u=JSON.parse(localStorage.getItem('currentUser')||'null'); return u && u.rayon ? u.rayon : null; } catch(e){return null;} })() );
  }

  // Load data from API
  async function loadData() {
    let all = [];
    try {
        all = await API.pengajuan.getAll();
    } catch(e) {
        console.error("Failed to load pengajuan", e);
        all = [];
    }
    
    const rayon = getRayon();
    
    // Filter for this koordinator's rayon
    const rayonItems = all.filter(i => {
      if (rayon && i.rayon && String(i.rayon) !== String(rayon) && !String(i.rayon).includes(String(rayon))) return false;
      return true;
    });

    // Filter verified items - EXCLUDE rejected/ditolak items
    const verified = rayonItems.filter(i => {
      const s = (i.status||'').toLowerCase();
      // Exclude rejected items - they should NOT appear in verified list
      if (s === 'ditolak' || s === 'rejected' || s === 'rejected_by_koor') return false;
      
      // Include items that are explicitly verified OR have moved past koordinator
      return s === 'diterima' || s === 'diverifikasi' || s === 'terverifikasi' || 
             s === 'disposisi_to_sekretaris' || s === 'disposisi_to_pendeta' || s === 'disposisi_to_tatausaha' ||
             s === 'validated_by_pendeta' || s === 'validated' || s === 'surat_dibuat' || s === 'archived' ||
             i.verified_by_koordinator === true;
    });
    
    // Sort verified by latest update
    verified.sort((a,b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

    return verified;
  }

  function renderTable(list){
    const tbody = document.querySelector('#verified-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-muted text-center py-3">Tidak ada data riwayat verifikasi.</td></tr>`;
      return;
    }
    
    list.forEach((it, idx) => {
      // Flatten form data if exists
      const flatItem = it.form && typeof it.form === 'object' ? { ...it, ...it.form } : it;
      
      const tr = document.createElement('tr');
      const s = (flatItem.status||'').toLowerCase();
      let statusBadge = '<span class="badge bg-secondary">Unknown</span>';
      
      if (s === 'ditolak') {
          statusBadge = '<span class="badge bg-danger">Ditolak</span>';
      } else if (s === 'diterima' || s === 'diverifikasi' || s === 'terverifikasi') {
          statusBadge = '<span class="badge bg-success">Diverifikasi</span>';
      } else {
          // For other statuses that imply verification passed (like disposisi, validated, etc)
          statusBadge = `<span class="badge bg-info text-dark">${escapeHtml(flatItem.status)}</span>`;
      }
        
      tr.innerHTML = `
        <td data-label="No">${idx+1}</td>
        <td data-label="Pengirim">
          <div class="fw-semibold">${escapeHtml(flatItem.user_nama || flatItem.pemohon_nama || flatItem.nama || flatItem.pemohon || '-')}</div>
          <small class="text-muted">#${escapeHtml(String(it.id||it._id||'').substring(0,8))}</small>
        </td>
        <td data-label="Jenis Surat"><span class="type-badge">${escapeHtml(flatItem.jenis || flatItem.type || '-')}</span></td>
        <td data-label="Perihal"><div class="text-truncate">${escapeHtml(flatItem.perihal || flatItem.ringkasan || flatItem.keterangan || '-')}</div></td>
        <td data-label="Tanggal">${fmtDateTime(flatItem.created_at || flatItem.createdAt || flatItem.tanggal || flatItem.date)}</td>
        <td data-label="Status">${statusBadge}</td>
        <td class="actions" data-label="Aksi">
          <button class="btn btn-sm btn-outline-primary" data-action="detail" data-id="${it.id||it._id}" title="Lihat detail"><i class="bi bi-eye"></i> Detail</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Detail Modal Logic
  const detailModal = document.getElementById('detail-modal');
  const detailBody = document.getElementById('detail-body');
  const detailJudul = document.getElementById('detail-judul');

  function computeAge(dobStr, refDate){
    if (!dobStr) return null;
    let dob = new Date(dobStr);
    if (isNaN(dob)){
      const parts = String(dobStr).split(',');
      if (parts.length >= 2){
        const datePart = parts[1].trim();
        const [d,m,y] = datePart.split('-');
        if (d && m && y) dob = new Date(`${y}-${m}-${d}`);
      }
    }
    if (isNaN(dob)) return null;
    const ref = refDate ? new Date(refDate) : new Date();
    let age = ref.getFullYear() - dob.getFullYear();
    const monthDiff = ref.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate())) age--;
    return age;
  }

  function renderField(label, value) {
    return `<div class="detail-row"><div class="detail-label">${escapeHtml(label)}</div><div class="detail-value">${value===undefined||value===null?'-':value}</div></div>`;
  }

  async function openDetail(id){
    let item = null;
    try {
        item = await API.pengajuan.getById(id);
    } catch(e) {
        alert('Data tidak ditemukan'); return;
    }

    if(!item){ alert('Data tidak ditemukan'); return; }
    
    // Flatten form data into top level (same fix as Jemaat detail page)
    if (item.form && typeof item.form === 'object') {
      Object.assign(item, item.form);
    }
    
    if(detailJudul) detailJudul.textContent = `Detail — ${item.jenis || item.type || '-'}`;
    
    // compute age from submission date and birth date
    const dobStr = item.tgl_lahir || item.ttl;
    const refDate = item.created_at || item.createdAt || item.tanggal || new Date();
    
    // Build card-based layout
    let html = '';
    
    // Card 1: Informasi Pemohon
    html += `
    <div class="detail-card">
      <div class="detail-card-header">
        <i class="bi bi-person-circle"></i>
        <span>Informasi Pemohon</span>
      </div>
      <div class="detail-card-body">
        ${renderField('Nama Lengkap', escapeHtml(item.user_nama || item.pemohon_nama || item.nama || '-'))}
        ${renderField('NIK', escapeHtml(item.user_nik || item.pemohon_nik || item.nik || '-'))}
        ${renderField('Email', escapeHtml(item.user_email || item.email || item.pemohon_email || '-'))}
        ${renderField('Rayon', escapeHtml(item.rayon || item.user_rayon || getRayon() || '-'))}
      </div>
    </div>`;
    
    // Card 2: Detail Surat
    const s = (item.status || '').toLowerCase();
    let statusBadge = '<span class="badge bg-secondary">Unknown</span>';
    if (s === 'ditolak') {
      statusBadge = '<span class="badge bg-danger">Ditolak</span>';
    } else if (s === 'diterima' || s === 'diverifikasi' || s === 'terverifikasi') {
      statusBadge = '<span class="badge bg-success">Diverifikasi</span>';
    } else {
      statusBadge = `<span class="badge bg-info text-dark">${escapeHtml(item.status)}</span>`;
    }
    
    html += `
    <div class="detail-card">
      <div class="detail-card-header">
        <i class="bi bi-file-earmark-text"></i>
        <span>Detail Surat</span>
      </div>
      <div class="detail-card-body">
        ${renderField('Jenis Surat', escapeHtml(item.jenis || item.type || item.tipe || '-'))}
        ${renderField('Perihal / Ringkasan', escapeHtml(item.perihal || item.ringkasan || item.keterangan || '-'))}
        ${renderField('Tanggal Pengajuan', escapeHtml(fmtDateTime(item.created_at || item.createdAt || item.tanggal || item.date)))}
        ${renderField('Status', statusBadge)}
      </div>
    </div>`;

    // type-specific logic (similar to daftar-surat-masuk.js)
    const t = (item.type || item.jenis || '').toLowerCase();
    if(t.includes('saksi')){
      html += `
      <div class="detail-card">
        <div class="detail-card-header">
          <i class="bi bi-people"></i>
          <span>Data Saksi</span>
        </div>
        <div class="detail-card-body">`;
      
      const s1 = item.saksi1 || item.saksi_1 || {};
      html += `${renderField('Nama Saksi 1', `<strong>${escapeHtml(s1.nama || '-')}</strong>`)}`;
      html += renderField('Tempat, Tgl Lahir', `${escapeHtml(s1.tempat_lahir || '-')}, ${s1.tgl_lahir || (s1.ttl ? escapeHtml(s1.ttl) : '-')}`);
      
      if(item.saksi_count === 2 || item.saksi2 || item.saksi_2){
        const s2 = item.saksi2 || item.saksi_2 || {};
        html += `<div style="height:12px"></div>`;
        html += `${renderField('Nama Saksi 2', `<strong>${escapeHtml(s2.nama || '-')}</strong>`)}`;
        html += renderField('Tempat, Tgl Lahir', `${escapeHtml(s2.tempat_lahir || '-')}, ${s2.tgl_lahir || (s2.ttl ? escapeHtml(s2.ttl) : '-')}`);
      }
      
      html += `</div></div>`;
    } else if(t === 'rekomendasi' || t === 'keterangan' || t === 'rekomendasi-menikah' || t === 'rekomendasi-kegiatan'){
      html += `
      <div class="detail-card">
        <div class="detail-card-header">
          <i class="bi bi-person-check"></i>
          <span>Data Terkait Surat</span>
        </div>
        <div class="detail-card-body">`;
      
      // Data already flattened from item.form to item level
      html += renderField('Nama', escapeHtml(item.nama || item.pemohon_nama || '-'));
      
      const rkTempatLahir = escapeHtml(item.tempat_lahir || '-');
      const rkTglLahir = item.tgl_lahir || item.ttl || '-';
      html += renderField('Tempat, Tgl Lahir', `${rkTempatLahir}, ${rkTglLahir}`);
      
      const rkAge = computeAge(item.tgl_lahir || item.ttl, refDate);
      html += renderField('Umur', rkAge !== null ? `${rkAge} tahun` : (item.umur || '-'));
      html += renderField('Jenis Kelamin', escapeHtml(item.jk || item.jenis_kelamin || '-'));
      html += renderField('Agama', escapeHtml(item.agama || '-'));
      
      // Address from flattened data
      const rkAlamatParts = [];
      if (item.jalan) rkAlamatParts.push(escapeHtml(item.jalan));
      if (item.rt || item.rw) rkAlamatParts.push(`RT ${escapeHtml(item.rt||'-')}/RW ${escapeHtml(item.rw||'-')}`);
      if (item.kelurahan) rkAlamatParts.push(`Kel. ${escapeHtml(item.kelurahan)}`);
      if (item.kecamatan) rkAlamatParts.push(`Kec. ${escapeHtml(item.kecamatan)}`);
      if (item.kota) rkAlamatParts.push(escapeHtml(item.kota));
      const rkAlamat = rkAlamatParts.length > 0 ? rkAlamatParts.join(', ') : '-';
      html += renderField('Alamat Lengkap', rkAlamat);
      
      if(t === 'rekomendasi-kegiatan'){
        html += `<div style="height:12px"></div>`;
        html += renderField('Lokasi Kegiatan', escapeHtml(item.lokasi || '-'));
        html += renderField('Tanggal Mulai', escapeHtml(item.tgl_mulai || '-'));
        html += renderField('Tanggal Selesai', escapeHtml(item.tgl_selesai || '-'));
      }
      
      html += `</div></div>`;
    } else {
      html += `
      <div class="detail-card">
        <div class="detail-card-header">
          <i class="bi bi-info-circle"></i>
          <span>Keperluan</span>
        </div>
        <div class="detail-card-body">
          ${renderField('Keperluan / Untuk', escapeHtml(item.untuk || item.keperluan || '-'))}
        </div>
      </div>`;
    }

    // attachments
    const files = item.files ? (item.files.draft ? [item.files.draft] : []) : (item.lampiran || []);
    if (item.file_utama) files.push({ name: item.file_utama_name || item.file_utama, url: item.file_utama });

    html += `
    <div class="detail-card">
      <div class="detail-card-header">
        <i class="bi bi-paperclip"></i>
        <span>Lampiran</span>
      </div>
      <div class="detail-card-body">`;
    
    // Cek apakah tipe surat adalah 'surat lainnya' (hanya tipe ini yang memiliki lampiran)
    const tipeSurat = (item.tipe || item.jenis || '').toLowerCase();
    const isSuratLainnya = tipeSurat.includes('lainnya') || tipeSurat.includes('lain');
    
    if (!isSuratLainnya) {
      // Jika bukan 'surat lainnya', tampilkan '-'
      html += `-`;
    } else if(files && files.length){
      files.forEach(f => {
        const url = typeof f === 'string' ? f : (f.url || f.path || f.link || f.data || '#');
        const name = typeof f === 'string' ? f.split('/').pop() : (f.name || f.filename || 'Lampiran');
        html += `
        <div class="file-attachment">
          <i class="bi bi-file-earmark-pdf text-danger"></i>
          <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(name)}</a>
        </div>`;
      });
    } else {
      html += `<div class="text-muted">Tidak ada lampiran</div>`;
    }
    
    html += `</div></div>`;

    // notes & timeline
    html += `
    <div class="detail-card">
      <div class="detail-card-header">
        <i class="bi bi-chat-left-text"></i>
        <span>Catatan</span>
      </div>
      <div class="detail-card-body">
        <div class="detail-value">${escapeHtml(item.catatan || item.note || item.keterangan || 'Tidak ada catatan')}</div>
      </div>
    </div>`;
    
    const history = item.timeline || item.history || [];
    html += `
    <div class="detail-card">
      <div class="detail-card-header">
        <i class="bi bi-clock-history"></i>
        <span>Riwayat</span>
      </div>
      <div class="detail-card-body">`;
    
    if(history && history.length){
      history.forEach(h => {
        html += `
        <div class="timeline-item">
          <div class="timeline-date">
            <i class="bi bi-calendar-event"></i>
            ${escapeHtml(fmtDateTime(h.at || h.tanggal || h.waktu || ''))}
          </div>
          <div class="timeline-text">${escapeHtml(h.note || h.keterangan || h.status || '')}</div>
        </div>`;
      });
    } else {
      html += `<div class="text-muted">Belum ada riwayat</div>`;
    }
    
    html += `</div></div>`;
    
    if(detailBody) detailBody.innerHTML = html;

    // show modal
    try { if (typeof detailModal.showModal === 'function') detailModal.showModal(); else alert(detailBody.textContent); } catch(e) { alert('Tidak dapat membuka modal detail'); }
  }

  // Event delegation
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    
    if(action === 'detail'){
      await openDetail(id);
    }
  });

  // Close modal button
  const btnClose = document.getElementById('detail-close-bottom');
  if(btnClose) btnClose.addEventListener('click', () => { try{ detailModal.close(); }catch(e){} });

  // Initial load
  (async () => {
    const list = await loadData();
    renderTable(list);
  })();

})();
