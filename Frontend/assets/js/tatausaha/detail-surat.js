// Tata Usaha - Detail Surat Controller
(function(){
  const qs = (id) => document.getElementById(id);
  // keep track of created object URLs to prevent leaks
  let currentObjectUrl = null;

  function getId(){
    return (new URLSearchParams(window.location.search)).get('id');
  }

  function formatDate(dt){
    try {
      const d = new Date(dt);
      if (!isFinite(d)) return String(dt||'');
      return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    } catch(e){ return String(dt||''); }
  }

  function escapeHtml(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function formatFileSize(bytes){
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  function friendlyLabel(key){
    const map = {
      jenis: 'Jenis Surat',
      nama: 'Nama Lengkap',
      nomor: 'Nomor Surat',
      nomor_seq: 'Nomor Urut Surat',
      umur: 'Umur',
      final_file_name: 'Nama File Surat',
      alamat: 'Alamat',
      tanggal: 'Tanggal Dibuat',
      keterangan: 'Keterangan',
      catatan: 'Catatan',
      phone: 'Nomor Telepon / HP',
      no_hp: 'Nomor Telepon / HP',
      pemohon_email: 'Email Pemohon',
      pemohon_nama: 'Nama Pemohon',
      pemohon_nik: 'NIK Pemohon',
      user_nik: 'NIK Pengaju',
      user_nama: 'Nama Pengaju',
      user_email: 'Email Pengaju',
      user_rayon: 'Rayon Pengaju',
      rayon: 'Rayon',
      jk: 'Jenis Kelamin',
      verified_by_koordinator: 'Diverifikasi Koordinator',
      saksi1: 'Data Saksi 1',
      saksi2: 'Data Saksi 2',
      tempat_lahir: 'Tempat Lahir',
      tgl_lahir: 'Tanggal Lahir',
      tgl_mulai: 'Tanggal Mulai Kegiatan',
      tgl_selesai: 'Tanggal Selesai Kegiatan',
      lokasi: 'Lokasi / Tempat Kegiatan',
      untuk: 'Ditujukan Kepada',
      untuk_kepada: 'Ditujukan Kepada',
      agama: 'Agama',
      pekerjaan: 'Pekerjaan',
      perihal: 'Perihal / Keperluan Surat',
      keperluan: 'Keperluan Surat',
      nik: 'NIK (Nomor Induk Kependudukan)',
      email: 'Email',
      file_url: 'File Url',
      final_file_url: 'Final File Url'
    };
    if (map[key]) return map[key];
    return key.replace(/[\-_]/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
  }

  function formatSaksi(s) {
    if (!s || typeof s !== 'object') return '-';
    const parts = [];
    if (s.nama) parts.push(`<strong>Nama:</strong> ${escapeHtml(s.nama)}`);
    if (s.tempat_lahir || s.tgl_lahir) parts.push(`<strong>TTL:</strong> ${escapeHtml(s.tempat_lahir || '')}, ${escapeHtml(s.tgl_lahir || '')}`);
    
    // Add Umur (Age) calculation
    if (s.tgl_lahir || s.ttl) {
      const age = computeAge(s.tgl_lahir || s.ttl);
      if (age !== null) {
        parts.push(`<strong>Umur:</strong> ${age} tahun`);
      }
    }
    
    if (s.jk) parts.push(`<strong>JK:</strong> ${escapeHtml(s.jk)}`);
    if (s.agama) parts.push(`<strong>Agama:</strong> ${escapeHtml(s.agama)}`);
    
    const alamat = [];
    if (s.jalan) alamat.push(s.jalan);
    if (s.rt || s.rw) alamat.push(`RT ${s.rt||'-'}/RW ${s.rw||'-'}`);
    if (s.kelurahan) alamat.push(s.kelurahan);
    if (s.kota) alamat.push(s.kota);
    if (alamat.length) parts.push(`<strong>Alamat:</strong> ${escapeHtml(alamat.join(', '))}`);
    
    return parts.join('<br>');
  }
  
  function computeAge(dobStr, refDate) {
    if (!dobStr) return null;
    let dob = new Date(dobStr);
    if (isNaN(dob)) {
      // Try parse legacy ttl format "Place, DD-MM-YYYY"
      const parts = String(dobStr).split(',');
      if (parts.length >= 2) {
        const datePart = parts[1].trim();
        const [d, m, y] = datePart.split('-');
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

  function pickDetailFields(item){
    // Omit: internal fields + duplicate fields (already shown in header sections)
    const omit = new Set([
      'id','status','created_at','last_updated','draft_surat','final_file','final_file_data',
      'final_file_name','final_file_type','final_file_size','history','logs','user','user_id',
      'account_id','type','createdAt','timeline','verified','rawForm',
      '_id','__v','nomor_seq','nomor_assigned_at','verifiedAt','verified_by_rayon','archived_at',
      'saksi_count','files','meta','notes','form', // internal logic fields
      'nomor_surat', // avoid duplicate with 'nomor' field
      // Duplicate fields - already shown in Informasi Pengaju section
      'user_nik','user_nama','user_email','user_rayon','rayon',
      'email', // email pengaju already shown
      'nik', // NIK pengaju already shown
      'pemohon_nama','pemohon_nik','pemohon_email', // duplicate pemohon info
      'tipe','jenis' // type already shown in Informasi Surat
    ]);
    
    // Address fields to be combined
    const addressKeys = new Set(['jalan','rt','rw','kelurahan','kecamatan','kota']);
    
    const out = [];
    
    // 1. PRIORITAS URUTAN - Field penting untuk mengetik surat
    // Diurutkan sesuai kebutuhan TU saat mengetik surat
    const priorityKeys = [
      // NOMOR SURAT
      'nomor',                           // Nomor surat yang sudah ditetapkan
      
      // IDENTITAS UTAMA (paling penting untuk surat)
      'perihal', 'keperluan',           // Tujuan/perihal surat
      'nama',                            // Nama lengkap
      'tempat_lahir', 'tgl_lahir',      // Tempat, tanggal lahir
      'jk', 'agama',                    // Jenis kelamin, agama
      
      // ALAMAT (sudah digabung di bawah)
      
      // KONTAK
      'phone', 'no_hp',                 // Nomor HP/telepon
      
      // DATA TAMBAHAN (tergantung jenis surat)
      'pekerjaan',                       // Pekerjaan
      'umur',                            // Umur
      'untuk', 'untuk_kepada',          // Ditujukan kepada
      'tgl_mulai', 'tgl_selesai',       // Rentang tanggal (untuk surat kegiatan)
      'lokasi',                          // Lokasi kegiatan/acara
      
      // CATATAN TERAKHIR
      'keterangan', 'catatan',          // Keterangan/catatan tambahan
      
      // FILE (paling bawah)
      'final_file_name'                 // Nama file surat
    ];
    
    priorityKeys.forEach(k => {
      if (item[k] && !omit.has(k) && !addressKeys.has(k)) {
        out.push({ key: k, label: friendlyLabel(k), value: item[k] });
        omit.add(k); // mark as handled
      }
    });

    // 2. Handle Address Combination
    const addressParts = [];
    if (item.jalan) addressParts.push(item.jalan);
    if (item.rt || item.rw) addressParts.push(`RT ${item.rt||'-'} / RW ${item.rw||'-'}`);
    if (item.kelurahan) addressParts.push(`Kel. ${item.kelurahan}`);
    if (item.kecamatan) addressParts.push(`Kec. ${item.kecamatan}`);
    if (item.kota) addressParts.push(item.kota);
    
    if (addressParts.length > 0) {
       out.push({ key: 'alamat_lengkap', label: 'Alamat Lengkap', value: addressParts.join(', ') });
    }

    // 3. Handle Saksi explicitly
    if (item.saksi1) {
      out.push({ key: 'saksi1', label: friendlyLabel('saksi1'), value: formatSaksi(item.saksi1), isHtml: true });
      omit.add('saksi1');
    }
    if (item.saksi2) {
      out.push({ key: 'saksi2', label: friendlyLabel('saksi2'), value: formatSaksi(item.saksi2), isHtml: true });
      omit.add('saksi2');
    }

    // 4. Iterate remaining keys
    Object.keys(item||{}).forEach(k => {
      if (omit.has(k)) return;
      if (addressKeys.has(k)) return; // Skip individual address fields
      
      let v = item[k];
      
      // Format verified_by_koordinator to Indonesian
      if (k === 'verified_by_koordinator') {
        if (v === true || v === 'true' || String(v).toLowerCase() === 'true') {
          v = 'Ya';
        } else if (v === false || v === 'false' || String(v).toLowerCase() === 'false') {
          v = 'Tidak';
        } else {
          v = '-';
        }
      }
      
      // Skip objects but allow empty strings (will show as '-')
      if (v === null || v === undefined || (typeof v === 'object' && !Array.isArray(v))) return;
      // Display '-' for empty values
      const displayValue = (v === '' || (typeof v === 'string' && v.trim() === '')) ? '-' : v;
      
      // SPECIAL: Detect URL fields and render as button to open in new tab
      const isUrlField = (k === 'file_url' || k === 'final_file_url' || k.toLowerCase().includes('url')) && 
                         typeof displayValue === 'string' && 
                         displayValue !== '-' && 
                         (displayValue.startsWith('http://') || displayValue.startsWith('https://'));
      
      if (isUrlField) {
        out.push({ 
          key: k, 
          label: friendlyLabel(k), 
          value: `<a href="${escapeHtml(displayValue)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary" style="display:inline-flex;align-items:center;gap:6px;"><i class="bi bi-eye"></i> Lihat Preview File <i class="bi bi-box-arrow-up-right"></i></a>`,
          isHtml: true 
        });
      } else {
        out.push({ key: k, label: friendlyLabel(k), value: displayValue });
      }
    });
    return out;
  }

  function findUser(item){
    const users = (LS.loadArray ? LS.loadArray('users') : []) || [];
    let u = null;
    if (item.user_id) u = users.find(x => x && (x.id===item.user_id || String(x.id)===String(item.user_id)));
    if (!u && item.email) u = users.find(x => x && x.email && x.email===item.email);
    if (!u && item.account_id) u = users.find(x => x && (x.id===item.account_id || String(x.id)===String(item.account_id)));
    return u || { name: item.nama || '-', email: item.email || '-', phone: item.phone || '-' };
  }

  function renderDetail(item){

    const area = qs('preview-area');
    if (!area) return;
    const fields = pickDetailFields(item);
    const html = [];

    // === INFORMASI PENGAJU (Header Section) ===
    html.push('<div class="detail-section" style="background:linear-gradient(135deg, #e7f3ff 0%, #cfe2ff 100%);border:2px solid #0d6efd;border-radius:10px;padding:20px 24px;margin-bottom:24px;box-shadow:0 2px 8px rgba(13,110,253,0.08);">');
    html.push('  <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;flex-wrap:wrap;">');
    html.push('    <i class="bi bi-person-badge-fill" style="font-size:2rem;color:#0d6efd;"></i>');
    html.push('    <h5 style="margin:0;color:#084298;font-weight:700;font-size:1.25rem;flex:1;">Informasi Pengaju</h5>');
    html.push(`    <span style="background:#fff;padding:6px 16px;border-radius:999px;font-weight:700;color:#0d6efd;font-size:0.95rem;border:1px solid #0d6efd20;box-shadow:0 2px 8px #0d6efd11;display:flex;align-items:center;gap:8px;"><i class="bi bi-bookmark-star"></i> Tipe Surat: <span style="font-weight:800;">${escapeHtml(item.tipe || item.jenis || '—')}</span></span>`);
    html.push('  </div>');
    html.push('  <div class="info-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;">');

    // Nama Pengaju
    const pengajuNama = item.user_nama || item.nama || '-';
    html.push('    <div class="info-item" style="border-left:4px solid #0d6efd1a;">');
    html.push('      <div class="info-label"><i class="bi bi-person"></i> Nama Lengkap</div>');
    html.push(`      <div class="info-value" style="font-weight:700;color:#084298;display:flex;align-items:center;gap:8px;">${escapeHtml(pengajuNama)} <button class="btn btn-sm btn-outline-secondary copy-btn" data-copy="${escapeHtml(pengajuNama)}" title="Salin nama"><i class="bi bi-clipboard"></i></button></div>`);
    html.push('    </div>');

    // NIK Pengaju
    if (item.user_nik || item.nik) {
      html.push('    <div class="info-item">');
      html.push('      <div class="info-label"><i class="bi bi-credit-card-2-front"></i> NIK</div>');
      html.push(`      <div class="info-value" style="font-weight:600;color:#084298;">${escapeHtml(item.user_nik || item.nik || '-')}</div>`);
      html.push('    </div>');
    }

    // Email Pengaju
    if (item.user_email || item.email) {
      html.push('    <div class="info-item">');
      html.push('      <div class="info-label"><i class="bi bi-envelope"></i> Email</div>');
      html.push(`      <div class="info-value" style="font-weight:600;color:#084298;display:flex;align-items:center;gap:8px;">${escapeHtml(item.user_email || item.email || '-')} <button class="btn btn-sm btn-outline-secondary copy-btn" data-copy="${escapeHtml(item.user_email || item.email || '')}" title="Salin email"><i class="bi bi-clipboard"></i></button></div>`);
      html.push('    </div>');
    }

    // Nomor Urut Surat (per tahun)
    const currentYear = new Date().getFullYear();
    if (item.nomor_seq) {
      html.push('    <div class="info-item" style="border-left:4px solid #20c9971a;">');
      html.push(`      <div class="info-label"><i class="bi bi-123"></i> Surat ke-${item.nomor_seq} (${currentYear})</div>`);
      html.push(`      <div class="info-value" style="font-weight:700;color:#0d6efd;font-size:1.15rem;">#${item.nomor_seq} <small style="color:#20c997;font-size:0.8rem;margin-left:8px;"><i class="bi bi-check-circle-fill"></i> Valid</small></div>`);
      html.push('    </div>');
    } else {
      html.push('    <div class="info-item">');
      html.push(`      <div class="info-label"><i class="bi bi-123"></i> Nomor Urut Surat (${currentYear})</div>`);
      html.push('      <div class="info-value" style="font-weight:600;color:#ffc107;font-style:italic;">');
      html.push('        <i class="bi bi-hourglass-split"></i> Menunggu validasi');
      html.push('        <small style="display:block;color:#6c757d;font-size:0.75rem;margin-top:2px;"><i class="bi bi-info-circle"></i> Akan ditetapkan saat koordinator memvalidasi</small>');
      html.push('      </div>');
      html.push('    </div>');
    }

    // Nomor Surat Manual (Input by TU)
    html.push('    <div class="info-item" style="border-left:4px solid #ffc1071a;">');
    html.push('      <div class="info-label"><i class="bi bi-pencil-square"></i> Nomor Surat (Manual)</div>');
    html.push('      <div style="display:flex;gap:8px;align-items:center;">');
    const status = String(item.status||'').toLowerCase();
    // Enable input and button if status is disposisi_to_tatausaha (returned for revision)
    const isEditableNomor = status === 'disposisi_to_tatausaha';
    const isDisposisiAktif = /disposisi/.test(status) && !isEditableNomor && !/returned_by_sekretaris|returned_by_pendeta/.test(status);
    html.push(`        <input type="text" id="input-nomor-surat" value="${escapeHtml(item.nomor || item.nomor_surat || '')}" placeholder="Contoh: 001/GMIT-YGR/2025" style="flex:1;padding:6px 10px;border:2px solid #dee2e6;border-radius:6px;font-weight:600;font-family:monospace;font-size:0.95rem;" ${isDisposisiAktif ? 'disabled' : ''}>`);
    html.push(`        <button id="btn-save-nomor" class="btn btn-sm btn-primary" style="white-space:nowrap;" title="Simpan nomor surat" ${isDisposisiAktif ? 'disabled' : ''}><i class="bi bi-save"></i> Simpan</button>`);
    html.push(`        <button class="btn btn-sm btn-outline-secondary copy-btn" data-copy="${escapeHtml(item.nomor || item.nomor_surat || '')}" title="Salin nomor"><i class="bi bi-clipboard"></i></button>`);
    html.push('      </div>');
    html.push('      <small style="color:#6c757d;font-size:0.75rem;margin-top:4px;display:block;"><i class="bi bi-info-circle"></i> Ketik nomor surat sesuai format yang diinginkan</small>');
    html.push('    </div>');

    // Tanggal Dibuat
    if (item.created_at) {
      html.push('    <div class="info-item">');
      html.push('      <div class="info-label"><i class="bi bi-calendar"></i> Tanggal Dibuat</div>');
      html.push(`      <div class="info-value" style="font-weight:600;color:#212529;">${escapeHtml(formatDate(item.created_at))}</div>`);
      html.push('    </div>');
    }

    // Terakhir Diupdate
    if (item.last_updated) {
      html.push('    <div class="info-item">');
      html.push('      <div class="info-label"><i class="bi bi-clock-history"></i> Terakhir Diupdate</div>');
      html.push(`      <div class="info-value" style="font-weight:600;color:#212529;">${escapeHtml(formatDate(item.last_updated))}</div>`);
      html.push('    </div>');
    }

    html.push('  </div>');
    html.push('</div>');

    // Wire up copy buttons inside the rendered area
    setTimeout(() => {
      Array.from(area.querySelectorAll('.copy-btn')).forEach(b => {
        b.onclick = function(e){
          e.preventDefault();
          const val = b.getAttribute('data-copy') || '';
          if (navigator.clipboard) {
            navigator.clipboard.writeText(val);
            showToast('success', 'Disalin ke clipboard');
          }
        };
      });
    }, 100);
    
    // === DETAIL FORM SURAT ===
    html.push(
      '<div class="detail-section">',
      '  <h6 style="color:#495057;font-weight:700;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #dee2e6;">',
      '    <i class="bi bi-file-text"></i> Detail Pengajuan',
      '  </h6>'
    );
    
    // Show rejection note inline in detail when returned to TU
    if (String(item.status||'').toLowerCase() === 'disposisi_to_tatausaha'){
      const tl = (Array.isArray(item.timeline) ? item.timeline.slice() : (item.history || [])).filter(Boolean);
      function tms(v){ try{ return new Date(v).getTime()||0; }catch(e){ return 0; } }
      const sorted = tl.sort((a,b)=> tms(b.at||b.time||b.tanggal) - tms(a.at||a.time||a.tanggal));
      let entry = sorted.find(e => e && e.action==='disposisi_to_tatausaha' && (String(e.by).toLowerCase()==='sekretaris' || String(e.by).toLowerCase()==='pendeta'))
               || sorted.find(e => e && e.action==='disposisi_to_tatausaha');
      let note = '';
      if (entry && entry.note && String(entry.note).trim()!==''){
        note = String(entry.note).trim();
      } else if (entry && entry.keterangan){
        const ket = String(entry.keterangan);
        const m = ket.match(/catatan:\s*([\s\S]*)$/i);
        note = (m ? m[1] : ket).trim();
      } else if (item.rejection_note){
        note = String(item.rejection_note).trim();
      }
      if (note){
        html.push(
          '<div class="detail-row" style="background:#fff8f8;border-left:4px solid #dc3545;border-radius:6px;padding:10px 12px;">',
          '  <div class="detail-label" style="color:#dc3545;">Catatan Penolakan</div>',
          '  <div class="detail-sep">:</div>',
          `  <div class="detail-value" style="white-space:pre-wrap;">${escapeHtml(note)}</div>`,
          '</div>'
        );
      }
    }
    
    if (fields.length){
      fields.forEach(f => {
        html.push(
          '<div class="detail-row">',
          `  <div class="detail-label">${escapeHtml(f.label)}</div>`,
          '  <div class="detail-sep">:</div>',
          `  <div class="detail-value">${f.isHtml ? f.value : escapeHtml(f.value)}</div>`,
          '</div>'
        );
      });
    } else {
      html.push('<div class="text-muted text-center py-4">Tidak ada detail tambahan yang bisa ditampilkan.</div>');
    }
    
    html.push('</div>'); // Close detail-section
    
    area.innerHTML = html.join('\n');
  }

  async function renderFilePreview(item){
    const cont = qs('file-preview');
    if (!cont) return;
    cont.innerHTML = '';
    
    console.log('🎨 renderFilePreview called with item:', {
      _id: item._id,
      id: item.id,
      has_final_file_data: !!item.final_file_data,
      has_final_file: !!item.final_file,
      has_file_url: !!item.file_url,
      has_final_file_url: !!item.final_file_url,
      final_file_name: item.final_file_name,
      final_file_type: item.final_file_type,
      final_file_size: item.final_file_size,
      data_length: (item.final_file_data || item.final_file || '').length
    });
    

    // Support both S3 (file_url/final_file_url) and legacy Base64 (final_file_data/final_file)
    const fileUrl = item.file_url || item.final_file_url;
    const data = item.final_file_data || item.final_file || fileUrl;
    const type = (item.final_file_type||'').toLowerCase();
    const name = item.final_file_name || '';
    const isS3File = !!fileUrl && typeof data === 'string' && !data.startsWith('data:');

    // PATCH: Jika tidak ada data base64/file_url tapi ada metadata file, tetap tampilkan info file
    if (!data && name && item.final_file_size > 0) {
      cont.innerHTML = `
        <div class="no-preview">
          <i class="bi bi-file-earmark-pdf text-muted" style="font-size: 3rem;"></i>
          <p class="text-muted mt-2 mb-0">File sudah diunggah: <b>${escapeHtml(name)}</b></p>
          <small class="text-muted">File tidak bisa dipreview otomatis, silakan unduh untuk melihat.</small>
          <a href="${fileUrl || '#'}" class="btn btn-primary mt-3" target="_blank" rel="noopener">Unduh File</a>
        </div>
      `;
      updateDisposisiButton(true);
      return;
    }

    if (!data){
      console.log('⚠️ No file data found in item');
      cont.innerHTML = `
        <div class="no-preview">
          <i class="bi bi-file-earmark-x text-muted" style="font-size: 3rem;"></i>
          <p class="text-muted mt-2 mb-0">Belum ada file terunggah</p>
          <small class="text-muted">Upload file untuk melihat preview</small>
        </div>
      `;
      updateDisposisiButton(false);
      return;
    }
    
    console.log('✅ File data found, preparing preview...');

    // helper: convert dataURL to Blob (optionally force MIME type)
    function dataUrlToBlob(url, forceType){
      try {
        const parts = url.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const detected = mimeMatch ? mimeMatch[1] : (type || 'application/octet-stream');
        const mime = forceType || detected;
        const bstr = atob(parts[1] || '');
        const len = bstr.length;
        const u8 = new Uint8Array(len);
        for (let i=0;i<len;i++) u8[i] = bstr.charCodeAt(i);
        return new Blob([u8], { type: mime });
      } catch(e){ return null; }
    }

    // clear previous object URL if any
    if (currentObjectUrl){ 
      try { URL.revokeObjectURL(currentObjectUrl); } catch(e){} 
      currentObjectUrl = null; 
    }

    // FIXED: Deteksi tipe file dengan fallback ke extension
    const lowerName = name.toLowerCase();
    const isPdf = (type && type.includes('pdf')) || lowerName.endsWith('.pdf');
    const isImage = (type && (type.includes('image/jpeg') || type.includes('image/jpg') || type.includes('image/png'))) || 
                    lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png');
    const isWord = (type && (type.includes('word') || type.includes('msword') || type.includes('document'))) || 
                   lowerName.endsWith('.doc') || lowerName.endsWith('.docx');
    
    console.log('🔍 File type detection:', { name, type, isPdf, isImage, isWord, isS3File });

    if (isPdf){
      console.log('📄 Rendering PDF preview...');
      let srcUrl = data;
      
      // For Base64 data, convert to Blob URL with correct PDF MIME to trigger native viewer
      if (!isS3File && typeof data === 'string' && data.startsWith('data:')){
        const blob = dataUrlToBlob(data, 'application/pdf');
        if (blob){
          srcUrl = URL.createObjectURL(blob);
          currentObjectUrl = srcUrl;
        }
      } else if (isS3File) {
        // For S3 files, fetch as blob to avoid CORS issues with iframe
        console.log('📦 S3 file detected, fetching as blob...');
        try {
          const response = await fetch(srcUrl);
          if (response.ok) {
            const blob = await response.blob();
            srcUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            currentObjectUrl = srcUrl;
            console.log('✅ Blob URL created for S3 file');
          } else {
            console.error('❌ Failed to fetch S3 file:', response.status);
          }
        } catch (fetchError) {
          console.error('❌ Error fetching S3 file:', fetchError);
        }
      }

      // Embed PDF in iframe for preview
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:100%;height:600px;border:2px solid #e0e0e0;border-radius:8px;';
      iframe.type = 'application/pdf';
      iframe.src = srcUrl;
      iframe.setAttribute('title', 'Preview PDF');
      
      // Handle load events
      iframe.onload = () => {
        console.log('✅ Iframe loaded successfully');
      };
      
      iframe.onerror = (e) => {
        console.error('❌ Iframe failed to load PDF:', e);
      };
      
      cont.appendChild(iframe);

      // Provide action buttons (use original S3 URL for download, not blob URL)
      const downloadUrl = isS3File ? data : srcUrl;
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:10px;align-items:center;margin-top:10px;';
      actions.innerHTML = `
        <button class="btn btn-sm btn-primary" onclick="window.open('${downloadUrl}', '_blank')">
          <i class="bi bi-box-arrow-up-right"></i> Buka di Tab Baru
        </button>
        <a class="btn btn-sm btn-outline-primary" href="${downloadUrl}" download="${escapeHtml(name||'surat.pdf')}">
          <i class="bi bi-download"></i> Download PDF
        </a>
      `;
      cont.appendChild(actions);
    } else if (isImage){
      console.log('🖼️ Rendering image preview...');
      const img = document.createElement('img');
      img.style.cssText = 'max-width:100%;height:auto;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);';
      // CRITICAL: Force reload untuk ganti tipe file (PDF → JPG)
      // Avoid cache-busting on blob: URLs
      if (typeof data === 'string' && data.startsWith('blob:')){
        img.src = data;
      } else {
        img.src = data + (data.startsWith('data:') ? '' : ((data.includes('?') ? '&' : '?') + 't=' + Date.now()));
      }
      img.alt = name || 'preview';
      img.onload = () => console.log('✅ Image loaded:', name);
      img.onerror = () => console.error('❌ Image failed to load:', name);
      cont.appendChild(img);
    } else if (isWord) {
      // Word document preview
      const wrap = document.createElement('div');
      wrap.className = 'text-center py-5';
      wrap.innerHTML = `
        <i class="bi bi-file-earmark-word text-primary" style="font-size: 3rem;"></i>
        <p class="mt-3 mb-3 text-muted">Preview tidak tersedia untuk file Word</p>
        <p class="small text-muted mb-3">${escapeHtml(name || 'dokumen.docx')}</p>
        <a class="btn btn-outline-primary" href="${data}" download="${escapeHtml(name||'dokumen.docx')}">
          <i class="bi bi-download"></i> Download File Word
        </a>
      `;
      cont.appendChild(wrap);
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'text-center py-5';
      wrap.innerHTML = `
        <i class="bi bi-file-earmark-word text-primary" style="font-size: 3rem;"></i>
        <p class="mt-3 mb-3 text-muted">Preview tidak tersedia untuk file Word</p>
        ${data ? `<a class="btn btn-outline-primary" href="${data}" download="${escapeHtml(name||'dokumen')}">
          <i class="bi bi-download"></i> Download ${escapeHtml(name||'berkas')}
        </a>` : ''}
      `;
      cont.appendChild(wrap);
    }
    
    updateDisposisiButton(true);
  }

  function renderAccountInfo(item){
    const el = qs('meta-info');
    if (!el) return;
    const u = findUser(item);
    const name = u.name || u.full_name || u.nama || '-';
    const email = u.email || '-';
    const phone = u.phone || u.no_hp || '-';
    const rayon = u.rayon || u.ray || null;
    el.innerHTML = [
      '<ul class="list-unstyled mb-0">',
      `  <li><span class="small text-muted">Nama</span><div class="fw-semibold">${escapeHtml(name)}</div></li>`,
      `  <li class="mt-2"><span class="small text-muted">Email</span><div class="fw-semibold">${escapeHtml(email)}</div></li>`,
      `  <li class="mt-2"><span class="small text-muted">No. HP</span><div class="fw-semibold">${escapeHtml(phone)}</div></li>`,
      rayon ? `  <li class="mt-2"><span class="small text-muted">Rayon</span><div class="fw-semibold">${escapeHtml(rayon)}</div></li>` : '' ,
      '</ul>'
    ].join('\n');
  }

  function renderTimeline(item){
    const c = qs('timeline-list');
    const countEl = qs('timeline-count');
    if (!c) return;
    
    // Read from timeline (used by api.js pushDisposisi), history, or logs
    const hist = item.timeline || item.history || item.logs || [];
    
    if (!hist || !hist.length){ 
      c.innerHTML = '<div class="text-muted"><i class="bi bi-inbox" style="font-size:2.5rem;opacity:0.3;display:block;margin-bottom:12px;"></i>Belum ada riwayat aktivitas surat</div>'; 
      if (countEl) countEl.querySelector('span').textContent = '0 Aktivitas';
      return; 
    }
    
    // Filter out file_uploaded entries if status is disposisi_to_tatausaha (to avoid confusion)
    const filteredHist = String(item.status||'').toLowerCase() === 'disposisi_to_tatausaha' 
      ? hist.filter(h => h.action !== 'file_uploaded')
      : hist;
    
    // Update count
    if (countEl) {
      countEl.querySelector('span').textContent = `${filteredHist.length} Aktivitas`;
    }
    
    const html = ['<div class="timeline">'];
    filteredHist.forEach(h => {
      const time = h.at || h.time || h.timestamp || h.date || item.last_updated || item.created_at;
      const action = h.action || h.status || h.event || '-';
      const byRole = h.by || '';
      const note = h.note || h.keterangan || '';
      
      // Role name mapping with icons
      const roleNames = {
        'sekretaris': 'Sekretaris',
        'pendeta': 'Pendeta',
        'tatausaha': 'Tata Usaha',
        'koordinator': 'Koordinator',
        'jemaat': 'Jemaat'
      };
      const friendlyRole = byRole ? roleNames[byRole.toLowerCase()] || byRole : '';
      
      // Action labels with better icons
      const actionLabels = {
        'disposisi_to_sekretaris': '<i class="bi bi-send-fill"></i> Diteruskan ke Sekretaris',
        'disposisi_to_pendeta': '<i class="bi bi-send-fill"></i> Diteruskan ke Pendeta',
        'disposisi_to_tatausaha': '<i class="bi bi-arrow-return-left"></i> Dikembalikan ke Tata Usaha',
        'file_uploaded': '<i class="bi bi-file-earmark-arrow-up-fill"></i> File diunggah',
        'draft_saved': '<i class="bi bi-pencil-square"></i> Draft disimpan',
        'proses': '<i class="bi bi-file-earmark-plus-fill"></i> Surat dibuat',
        'submitted': '<i class="bi bi-send-check-fill"></i> Surat diajukan',
        'diterima': '<i class="bi bi-check-circle-fill"></i> Diverifikasi Koordinator',
        'verified': '<i class="bi bi-patch-check-fill"></i> Terverifikasi',
        'validated': '<i class="bi bi-shield-fill-check"></i> Validasi Final',
        'ditolak': '<i class="bi bi-x-circle-fill"></i> Ditolak'
      };
      const friendlyAction = actionLabels[action] || `<i class="bi bi-circle-fill"></i> ${escapeHtml(action)}`;
      
      // Special styling for rejection
      const isRejection = action === 'disposisi_to_tatausaha' || action === 'ditolak';
      const itemClass = isRejection ? 'timeline-item-reject' : 'timeline-item';
      
      html.push(
        `<div class="${itemClass}">`,
        `  <div class="timeline-header">`,
        `    <div class="time"><i class="bi bi-clock"></i> ${escapeHtml(formatDate(time))}</div>`,
        friendlyRole ? `    <div class="role-badge">${escapeHtml(friendlyRole)}</div>` : '',
        `  </div>`,
        `  <div class="status">${friendlyAction}</div>`,
        note ? `  <div class="note"><div class="note-header"><i class="bi bi-chat-left-text-fill"></i> Catatan</div><div class="note-content">${escapeHtml(note)}</div></div>` : '',
        '</div>'
      );
    });
    html.push('</div>');
    c.innerHTML = html.join('\n');
  }

  function isAllowedFile(file){
    if (!file) return false;
    const name = (file.name||'').toLowerCase();
    const allowedExt = ['.pdf','.doc','.docx','.jpg','.jpeg'];
    const okExt = allowedExt.some(ext => name.endsWith(ext));
    if (!okExt) return false;
    // Be permissive on MIME: some browsers/devices use non-standard types (e.g., application/x-pdf or application/octet-stream)
    const type = (file.type||'').toLowerCase();
    if (!type) return true; // rely on extension when browser doesn't provide type
    const allowedMimes = new Set([
      'application/pdf',
      'application/x-pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg'
    ]);
    // If MIME is unknown/generic but extension is ok, allow it
    if (type === 'application/octet-stream' || type === 'binary/octet-stream') return true;
    return allowedMimes.has(type);
  }

  function readFileAsDataURL(file){
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // Modern Toast Notification
  function showToast(type, message){
    const container = qs('toast-container') || document.body;
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    const iconMap = {
      success: 'bi-check-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      error: 'bi-x-circle-fill',
      info: 'bi-info-circle-fill'
    };
    
    toast.innerHTML = `
      <i class="toast-icon bi ${iconMap[type] || iconMap.info}"></i>
      <div class="toast-message">${escapeHtml(message)}</div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="bi bi-x"></i>
      </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Add toast slide out animation
  if (!document.getElementById('toast-animations')){
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes toastSlideOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
  }

  function updateDisposisiButton(hasFile){
    const btn = qs('btn-disposisi');
    const hint = qs('disposisi-hint');
    const uploadStatus = qs('upload-status');
    const statusBadge = qs('status-badge');

    // Patch: validasi file metadata juga
    let fileMeta = false;
    const item = window.currentItem;
    if (item && item.final_file_name && item.final_file_size > 0) fileMeta = true;
    const effectiveHasFile = hasFile || fileMeta;
    console.log('🔧 updateDisposisiButton called, hasFile:', effectiveHasFile);

    if (btn){
      btn.disabled = !effectiveHasFile;
      console.log('✅ Button disabled state:', btn.disabled);
      
      if (effectiveHasFile){
        if (hint){
          hint.classList.add('ready');
          hint.innerHTML = `
            <div class="hint-icon">
              <i class="bi bi-check-circle-fill"></i>
            </div>
            <div class="hint-text">
              <strong>Siap Disposisi!</strong>
              <span>File surat telah diunggah dan siap dikirim ke Sekretaris</span>
            </div>
          `;
        }
        if (uploadStatus){
          uploadStatus.classList.add('uploaded');
          uploadStatus.innerHTML = '<i class="bi bi-circle-fill"></i> Sudah Upload';
        }
      } else {
        if (hint){
          hint.classList.remove('ready');
          hint.innerHTML = `
            <div class="hint-icon">
              <i class="bi bi-info-circle-fill"></i>
            </div>
            <div class="hint-text">
              <strong>Informasi:</strong>
              <span>Upload file surat terlebih dahulu untuk mengaktifkan disposisi</span>
            </div>
          `;
        }
        if (uploadStatus){
          uploadStatus.classList.remove('uploaded');
          uploadStatus.innerHTML = '<i class="bi bi-circle-fill"></i> Belum Upload';
        }
      }
    } else {
      console.warn('⚠️ Tombol disposisi tidak ditemukan!');
    }
    
    // Update status badge in detail section
    if (statusBadge && hasFile){
      statusBadge.classList.add('status-verified');
      statusBadge.innerHTML = '<i class="bi bi-file-check-fill"></i> <span>File Terupload</span>';
    }
  }

  function displayFileInfo(file){
    const infoEl = qs('file-info');
    if (!infoEl) return;
    
    const sizeKB = (file.size / 1024).toFixed(2);
    const sizeDisplay = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB} KB`;
    
    infoEl.innerHTML = `
      <i class="bi bi-file-earmark-check-fill"></i>
      <div class="file-details">
        <div class="file-name">${escapeHtml(file.name)}</div>
        <div class="file-meta">${sizeDisplay} • ${file.type || 'Unknown type'}</div>
      </div>
      <button class="btn-remove" onclick="clearFileUpload()" title="Hapus file">
        <i class="bi bi-x-circle-fill"></i>
      </button>
    `;
    infoEl.style.display = 'flex';
    
    // Hide upload zone, show file info
    const uploadZone = qs('upload-zone');
    if (uploadZone) uploadZone.style.display = 'none';
  }

  window.clearFileUpload = function(){
    const inp = qs('file-upload');
    const infoEl = qs('file-info');
    const uploadZone = qs('upload-zone');
    
    if (inp) inp.value = '';
    if (infoEl){
      infoEl.style.display = 'none';
      infoEl.innerHTML = '';
    }
    if (uploadZone) uploadZone.style.display = 'block';
  };
  
  // Function to save nomor surat manual
  async function saveNomorSurat(itemRef) {
    const input = qs('input-nomor-surat');
    const btn = qs('btn-save-nomor');
    
    if (!input || !btn) return;
    
    const nomorSurat = input.value.trim();
    
    // Validate input - nomor surat WAJIB diisi
    if (!nomorSurat) {
      showToast('warning', 'Nomor surat harus diisi terlebih dahulu sebelum upload file');
      input.focus();
      return;
    }
    
    // Disable button while saving
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Menyimpan...';
    
    try {
      const itemId = (itemRef._id && String(itemRef._id)) || (itemRef.id && String(itemRef.id));
      
      const updates = {
        nomor: nomorSurat,
        nomor_surat: nomorSurat,
        last_updated: new Date().toISOString()
      };
      
      console.log('💾 Saving nomor surat:', nomorSurat);
      
      const updated = await LS.updateById('local_pengajuan', itemId, updates);
      console.log('✅ Nomor surat saved successfully:', updated);
      
      // CRITICAL: Merge form data before updating reference
      if (updated.form && typeof updated.form === 'object') {
        Object.assign(updated, updated.form);
      }
      
      // Update global reference
      window.currentItem = updated;
      
      showToast('success', `Nomor surat "${nomorSurat}" berhasil disimpan! Silakan upload file surat.`);
      
      // Re-render detail to show updated nomor
      renderDetail(updated);
      
      // Enable upload button after nomor surat is saved
      const uploadBtn = qs('file-upload');
      const uploadZone = qs('upload-zone');
      if (uploadBtn) {
        uploadBtn.disabled = false;
      }
      if (uploadZone) {
        uploadZone.classList.remove('disabled');
        uploadZone.style.opacity = '1';
        uploadZone.style.pointerEvents = 'auto';
      }
      
      // Re-wire event handlers after re-render
      setTimeout(() => {
        const btnSaveNomorNew = qs('btn-save-nomor');
        if (btnSaveNomorNew) {
          btnSaveNomorNew.addEventListener('click', () => {
            saveNomorSurat(window.currentItem);
          });
        }
        
        const inputNomorNew = qs('input-nomor-surat');
        if (inputNomorNew) {
          inputNomorNew.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveNomorSurat(window.currentItem);
            }
          });
        }
        
        // CRITICAL: Re-wire disposisi button after save nomor
        wireDisposisi(window.currentItem);
      }, 100);
      
    } catch (error) {
      console.error('❌ Failed to save nomor surat:', error);
      showToast('error', 'Gagal menyimpan nomor surat: ' + error.message);
    } finally {
      // Re-enable button
      const btnFinal = qs('btn-save-nomor');
      if (btnFinal) {
        btnFinal.disabled = false;
        try { btnFinal.innerHTML = '<i class="bi bi-save"></i> Simpan'; } catch(e){}
      }
    }

  }

  async function handleUpload(itemRef){
    const inp = qs('file-upload');
    if (!inp || !inp.files || !inp.files[0]) return;
    const file = inp.files[0];
    
    console.log('📤 handleUpload called with file:', file.name, 'size:', file.size);
    
    if (!isAllowedFile(file)){
      inp.value = '';
      showToast('warning', 'Tipe file tidak diizinkan. Hanya PDF, Word, JPG.');
      return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024){
      inp.value = '';
      showToast('warning', 'Ukuran file terlalu besar. Maksimal 10MB.');
      return;
    }
    
    // Clear old file preview if exists (for re-upload after rejection)
    if (currentObjectUrl){ 
      try { URL.revokeObjectURL(currentObjectUrl); } catch(e){} 
      currentObjectUrl = null; 
    }

    // Hapus file lama dari storage sebelum upload baru
    const itemId = (itemRef._id && String(itemRef._id)) || (itemRef.id && String(itemRef.id));
    if (itemRef.final_file || itemRef.final_file_data || itemRef.final_file_name) {
      try {
        await LS.updateById('local_pengajuan', itemId, {
          final_file: null,
          final_file_data: null,
          final_file_name: null,
          final_file_type: null,
          final_file_size: null,
          file_url: null,
          final_file_url: null
        });
        console.log('🗑️ File lama dihapus dari storage sebelum upload baru');
      } catch(e) {
        console.warn('Gagal hapus file lama:', e);
      }
    }

    displayFileInfo(file);

    console.log('📖 Reading file as Data URL...');
    const dataUrl = await readFileAsDataURL(file);
    console.log('✅ File read complete, data URL length:', dataUrl.length);

    const updates = {
      final_file: dataUrl, // fallback name for compatibility
      final_file_data: dataUrl,
      final_file_name: file.name,
      final_file_type: file.type || '',
      final_file_size: file.size || 0,
      last_updated: new Date().toISOString()
    };

    console.log('💾 Sending update to backend...', {
      id: itemId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      dataUrlLength: dataUrl.length
    });

    try {
      console.log('💾 Calling LS.updateById with:', { collection: 'local_pengajuan', id: itemId, updates });
      const updated = await LS.updateById('local_pengajuan', itemId, updates);
      console.log('✅ Backend update successful:', updated);
      console.log('📋 Updated file fields:', {
        final_file_data_length: updated?.final_file_data?.length || 0,
        final_file_name: updated?.final_file_name,
        final_file_type: updated?.final_file_type,
        final_file_size: updated?.final_file_size
      });

      let newItem = updated;

      // CRITICAL FIX: Merge form data to top level before rendering
      if (newItem.form && typeof newItem.form === 'object') {
        Object.assign(newItem, newItem.form);
      }

      // Tambahkan tracking untuk upload file
      if (LS.addTimeline) {
        await LS.addTimeline('local_pengajuan', itemId, {
          by: 'tatausaha',
          action: 'file_uploaded',
          note: `File surat ${file.name} berhasil diunggah`
        });
        // Reload item with timeline from API
        const arr = await API.pengajuan.getAll() || [];
        const refreshed = arr.find(x => x && (String(x._id) === String(itemId) || String(x.id) === String(itemId)));
        if (refreshed) {
          newItem = refreshed;
          // Merge form data after reload
          if (newItem.form && typeof newItem.form === 'object') {
            Object.assign(newItem, newItem.form);
          }
        }
      }

      // Update global reference
      window.currentItem = newItem;

      console.log('🔄 Refreshing UI with updated item...');
      renderDetail(newItem);
      renderTimeline(newItem); // Refresh timeline to show upload entry

      // Wait a moment for backend to process S3 upload
      await new Promise(resolve => setTimeout(resolve, 1000));

      // CRITICAL: Reload item from API to get the file_url (pre-signed URL from S3)
      console.log('🔄 Reloading item from API to get S3 URL...');
      try {
        const reloadedItem = await API.pengajuan.getById(itemId);
        if (reloadedItem) {
          newItem = reloadedItem;
          // Merge form data after reload
          if (newItem.form && typeof newItem.form === 'object') {
            Object.assign(newItem, newItem.form);
          }
          window.currentItem = newItem;
          console.log('✅ Item reloaded with file_url:', newItem.file_url || newItem.final_file_url);
        }
      } catch (reloadError) {
        console.warn('⚠️ Failed to reload item, using cached version:', reloadError);
      }

      // CRITICAL: Force re-render preview with updated data
      console.log('🎨 Force re-rendering file preview...');
      await renderFilePreview(newItem);

      // CRITICAL: Re-wire event handlers after DOM update
      console.log('🔌 Re-wiring disposisi button event handler...');
      wireDisposisi(newItem);

      // CRITICAL: Update disposisi button state after upload
      updateDisposisiButton(!!(newItem.final_file_data || newItem.final_file || (newItem.files && newItem.files.final && newItem.files.final.data)));

      showToast('success', 'File berhasil diupload dan siap untuk disposisi!');

      // Return updated item
      return newItem;
    } catch (error) {
      console.error('❌ Upload failed:', error);
      showToast('error', 'Gagal mengupload file: ' + error.message);
      inp.value = '';
      clearFileUpload();
      return null;
    }
  }

  // No modal preview anymore; use inline preview via renderFilePreview

  function wireDisposisi(item){
    const btn = qs('btn-disposisi');
    if (!btn) return;
    
    // Click handler untuk tombol disposisi
    btn.addEventListener('click', async () => {
      const currentItem = window.currentItem || item;
      // Use API instead of localStorage to get latest data
      const all = await API.pengajuan.getAll() || [];
      const latestItem = all.find(x => x && (String(x._id) === String(currentItem._id || currentItem.id) || String(x.id) === String(currentItem.id))) || currentItem;
      
      console.log('🔍 Checking validations for disposisi:', {
        has_final_file_data: !!latestItem.final_file_data,
        has_final_file: !!latestItem.final_file,
        has_nested_file: !!(latestItem.files && latestItem.files.final && latestItem.files.final.data),
        final_file_name: latestItem.final_file_name,
        has_nomor_surat: !!(latestItem.nomor_surat || latestItem.nomor)
      });
      
      // Validasi 1: Nomor surat harus sudah diinput
      const hasNomorSurat = !!(latestItem.nomor_surat || latestItem.nomor);
      if (!hasNomorSurat) {
        showToast('warning', 'Input nomor surat terlebih dahulu sebelum disposisi.');
        // Scroll to nomor surat input
        const nomorInput = qs('input-nomor-surat');
        if (nomorInput) {
          nomorInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          nomorInput.focus();
        }
        return;
      }
      
      // Validasi 2: File harus sudah diupload
      // Backend hanya kirim metadata, bukan data base64
      const hasFile = !!(
        latestItem.final_file_data || latestItem.final_file ||
        (latestItem.files && latestItem.files.final && latestItem.files.final.data) ||
        (latestItem.final_file_name && latestItem.final_file_size > 0)
      );
      
      if (!hasFile){
        showToast('warning', 'Unggah surat final terlebih dahulu sebelum disposisi.');
        return;
      }
      
      // Update global reference
      window.currentItem = latestItem;
      
      // Siapkan info file untuk ditampilkan di modal
      const fileName = latestItem.final_file_name || 'File surat';
      const fileSize = latestItem.final_file_size ? formatFileSize(latestItem.final_file_size) : '-';
      
      // Tampilkan confirmation modal
      ConfirmModal.show({
        type: 'success',
        title: 'Konfirmasi Disposisi Surat',
        message: `
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; color: #084298; font-size: 1rem;">
              Anda akan mengirim surat ini ke <strong>Sekretaris</strong> untuk proses selanjutnya.
            </p>
            <p style="margin: 0; color: #6c757d; font-size: 0.9rem;">
              Pastikan semua data sudah benar dan file surat telah diunggah dengan lengkap.
            </p>
          </div>
          
          <div style="background: linear-gradient(135deg, #e7f3ff 0%, #cfe2ff 100%); padding: 14px 16px; border-radius: 8px; border: 2px solid #0d6efd; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <i class="bi bi-file-earmark-check" style="font-size: 1.2rem; color: #0d6efd;"></i>
              <strong style="color: #084298;">File yang akan dikirim:</strong>
            </div>
            <div style="padding-left: 30px;">
              <div style="color: #084298; font-weight: 600; margin-bottom: 4px;">${escapeHtml(fileName)}</div>
              <div style="color: #6c757d; font-size: 0.85rem;">Ukuran: ${escapeHtml(fileSize)}</div>
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
            // Get the item ID (use _id for MongoDB)
            const itemId = String(latestItem._id || latestItem.id);
            
            console.log('📤 Sending disposisi to Sekretaris for item:', itemId);
            
            // Use API to update status (same as daftar-terverifikasi.js)
            await API.pengajuan.updateStatus(itemId, {
              status: 'disposisi_to_sekretaris',
              by: 'Tata Usaha',
              note: 'Dikirim oleh Tata Usaha',
              to_role: 'sekretaris'
            });
            
            console.log('✅ Disposisi sent successfully');
            showToast('success', 'Disposisi berhasil dikirim ke Sekretaris!');
            
            // Redirect to list after short delay
            setTimeout(() => {
              window.location.href = 'daftar-disposisi.html';
            }, 1800);
          } catch (error) {
            console.error('❌ Disposisi failed:', error);
            showToast('error', 'Gagal mengirim disposisi: ' + error.message);
          }
        }
      });
    });
  }

  async function init(){
    const id = getId();
    const upload = qs('file-upload');
    if (!id){
      const area = qs('preview-area');
      if (area) area.innerHTML = '<div class="alert alert-warning">ID pengajuan tidak ditemukan.</div>';
      return;
    }
    console.log('🔍 Loading pengajuan with id:', id);
    // Try to load full detail from backend (this will generate a pre-signed file_url if available)
    let item = null;
    try {
      item = await API.pengajuan.getById(id);
      console.log('✅ Loaded pengajuan detail from API.getById', { id: id, has_file_url: !!(item && (item.file_url || item.final_file_url)) });
    } catch (e) {
      console.warn('⚠️ API.getById failed, falling back to getAll:', e && e.message);
    }

    // Fallback: if getById didn't find or failed, try fetching all and matching
    if (!item) {
      const all = await API.pengajuan.getAll() || [];
      console.log('📦 Total pengajuan loaded (fallback):', all.length);
      item = all.find(x => x && (String(x._id) === String(id) || String(x.id) === String(id)));
    }

    if (!item){
      console.error('❌ Pengajuan not found with id:', id);
      const area = qs('preview-area');
      if (area) area.innerHTML = '<div class="alert alert-danger">Data pengajuan tidak ditemukan.</div>';
      return;
    }
    
    console.log('✅ Found pengajuan:', {
      _id: item._id,
      id: item.id,
      status: item.status,
      has_file: !!(item.final_file_data || item.final_file)
    });

    // Show alert if letter was returned from Sekretaris/Pendeta
    console.log('🔍 CHECKING STATUS:', item.status);
    console.log('🔍 SHOULD SHOW ALERT:', String(item.status||'').toLowerCase() === 'disposisi_to_tatausaha');
    
    if (String(item.status||'').toLowerCase() === 'disposisi_to_tatausaha') {
      console.log('✅ STATUS MATCHED! Will show rejection alert...');
      const timeline = (Array.isArray(item.timeline) ? item.timeline.slice() : (item.history || [])).filter(Boolean);

      // Helper: pick latest return entry by time
      function parseDateSafe(v){ try{ return new Date(v).getTime() || 0; }catch(e){ return 0; } }
      function isReturnBySekOrPen(e){
        return e && e.action === 'disposisi_to_tatausaha' && (String(e.by).toLowerCase()==='sekretaris' || String(e.by).toLowerCase()==='pendeta');
      }
      // sort desc by time, then find first matching
      const sorted = timeline.sort((a,b)=> parseDateSafe(b.at||b.time||b.tanggal) - parseDateSafe(a.at||a.time||a.tanggal));
      let returnEntry = sorted.find(isReturnBySekOrPen);

      // Secondary fallback: any disposisi_to_tatausaha
      if (!returnEntry) returnEntry = sorted.find(e => e && e.action === 'disposisi_to_tatausaha');

      // FINAL FALLBACK: use item-level fields if available
      if (!returnEntry && (item.rejection_note || item.keterangan)) {
        returnEntry = {
          by: item.returned_by || 'sekretaris',
          note: item.rejection_note || item.keterangan || '',
          at: item.returned_at || item.last_updated || new Date().toISOString()
        };
      }

      if (!returnEntry){
        console.warn('No return entry found; creating default placeholder');
        returnEntry = { by:'sekretaris', note:'Surat dikembalikan untuk perbaikan.', at: item.last_updated || new Date().toISOString() };
      }

      // Prefer raw note; fallback to parsing keterangan's trailing Catatan: ...
      function extractNote(e){
        if (e && e.note && String(e.note).trim() !== '') return String(e.note).trim();
        const ket = (e && e.keterangan) ? String(e.keterangan) : '';
        if (!ket) return '';
        const m = ket.match(/catatan:\s*([\s\S]*)$/i);
        return m ? m[1].trim() : ket.trim();
      }
      let returnNote = extractNote(returnEntry);
      if (!returnNote) returnNote = item.rejection_note || '';
      if (!returnNote) returnNote = 'Tidak ada catatan penolakan';
      
      console.log('✅ FINAL returnNote to display:', returnNote);
      
      const returnedBy = returnEntry.by || 'sekretaris';
      
      // Friendly role name mapping
      const roleNames = {
        'sekretaris': 'Sekretaris',
        'pendeta': 'Pendeta',
        'tatausaha': 'Tata Usaha',
        'koordinator': 'Koordinator'
      };
      const friendlyRole = roleNames[returnedBy.toLowerCase()] || returnedBy;
      
      // Get timestamp
      const returnTime = returnEntry && returnEntry.at ? formatDate(returnEntry.at) : '-';
      
      const alertDiv = document.createElement('div');
      alertDiv.className = 'alert alert-rejection';
      alertDiv.style.cssText = 'position:relative;z-index:100;margin-top:20px;margin-bottom:24px;border:2px solid #dc3545;background:linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);box-shadow:0 6px 20px rgba(220,53,69,0.2);border-radius:12px;animation:slideDown 0.5s ease;';
      alertDiv.innerHTML = `
        <div style="display:flex;align-items:start;gap:20px;padding:4px;">
          <div style="flex-shrink:0;width:56px;height:56px;background:linear-gradient(135deg, #dc3545 0%, #c82333 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(220,53,69,0.3);">
            <i class="bi bi-arrow-return-left" style="font-size:28px;color:#fff;"></i>
          </div>
          <div style="flex:1;">
            <h5 style="color:#dc3545;margin:0 0 16px 0;font-weight:700;font-size:1.2rem;">
              <i class="bi bi-exclamation-triangle-fill"></i> Surat Dikembalikan untuk Perbaikan
            </h5>
            <div style="background:#fff;padding:20px;border-radius:8px;margin-bottom:12px;border-left:4px solid #dc3545;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
              <div style="display:grid;grid-template-columns:140px 1fr;gap:12px 20px;margin-bottom:16px;">
                <strong style="color:#666;font-size:0.9rem;"><i class="bi bi-person-fill"></i> Dikembalikan oleh:</strong>
                <span style="color:#dc3545;font-weight:700;font-size:1rem;">${escapeHtml(friendlyRole)}</span>
                <strong style="color:#666;font-size:0.9rem;"><i class="bi bi-clock-fill"></i> Waktu Pengembalian:</strong>
                <span style="color:#666;font-weight:600;">${escapeHtml(returnTime)}</span>
                <strong style="color:#666;font-size:0.9rem;"><i class="bi bi-file-earmark-text"></i> Status Saat Ini:</strong>
                <span style="color:#dc3545;font-weight:600;">Menunggu Perbaikan</span>
              </div>
              <hr style="margin:16px 0;border:none;border-top:2px dashed #e0e0e0;">
              <div>
                <strong style="color:#dc3545;display:block;margin-bottom:12px;font-size:1rem;"><i class="bi bi-chat-square-text-fill"></i> Alasan Penolakan / Catatan:</strong>
                <div style="background:linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);padding:16px;border-radius:8px;border:2px solid #ffc107;color:#856404;line-height:1.8;font-size:0.95rem;white-space:pre-wrap;box-shadow:inset 0 2px 4px rgba(0,0,0,0.05);">
                  ${escapeHtml(returnNote)}
                </div>
              </div>
            </div>
            <div style="background:linear-gradient(135deg, #e7f3ff 0%, #cfe2ff 100%);padding:14px 18px;border-radius:8px;border:2px solid #0d6efd;margin-top:12px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <i class="bi bi-info-circle-fill" style="font-size:1.5rem;color:#0d6efd;"></i>
                <div>
                  <strong style="color:#084298;display:block;margin-bottom:4px;">Langkah Selanjutnya:</strong>
                  <small style="color:#084298;line-height:1.6;">1. Baca catatan penolakan dengan teliti<br>2. Lakukan perbaikan sesuai catatan<br>3. Upload file surat yang sudah diperbaiki<br>4. Kirim ulang disposisi ke Sekretaris/Pendeta</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      console.log('🎨 Alert HTML created');
      console.log('🔍 Looking for main.container...');
      
      const main = document.querySelector('main.container');
      console.log('📦 Main element:', main);
      
      if (main && main.firstChild) {
        main.insertBefore(alertDiv, main.firstChild);
        console.log('✅ Alert inserted successfully!');
        console.log('📍 Alert position:', alertDiv.getBoundingClientRect());
        
        // CRITICAL FIX: Scroll to alert and highlight it
        setTimeout(() => {
          alertDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
          console.log('📜 Scrolled to alert');
        }, 100);
        
      } else if (main) {
        main.appendChild(alertDiv);
        console.log('✅ Alert appended to main (no firstChild)');
        
        // Scroll to alert
        setTimeout(() => {
          alertDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        
      } else {
        // Fallback: insert ke body setelah navbar
        const body = document.querySelector('body');
        const navbar = document.querySelector('nav.navbar, header.navbar');
        if (body) {
          if (navbar && navbar.nextSibling) {
            body.insertBefore(alertDiv, navbar.nextSibling);
          } else {
            body.insertBefore(alertDiv, body.firstChild);
          }
          console.log('⚠️ Alert inserted to body (main not found)');
          
          // Scroll to alert
          setTimeout(() => {
            alertDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    } else {
      console.log('ℹ️ Status is not disposisi_to_tatausaha, skipping alert');
    }

    // Set global item reference
    window.currentItem = item;
    
    // Check if surat is already in disposisi workflow (read-only mode)
    const status = String(item.status || '').toLowerCase();
    const isInDisposisi = status === 'disposisi_to_sekretaris' || status === 'disposisi_to_pendeta';
    const isArchived = status === 'validated' || status === 'archived' || status === 'validated_by_pendeta' || 
                       item.validated === true || item.archived === true || item.validated_by_pendeta === true;
    const isReadOnly = isInDisposisi || isArchived;
    
    // Hide upload and disposisi sections if already in disposisi or archived
    if (isReadOnly) {
      const uploadCard = document.querySelector('.upload-card');
      const actionButtons = document.querySelector('.action-buttons');
      if (uploadCard) uploadCard.style.display = 'none';
      if (actionButtons) actionButtons.style.display = 'none';
      
      // Show info alert that this is read-only
      const alertDiv = document.createElement('div');
      alertDiv.className = 'alert alert-info';
      alertDiv.style.cssText = 'margin-top:20px;margin-bottom:24px;border:2px solid #0d6efd;background:linear-gradient(135deg, #e7f3ff 0%, #cfe2ff 100%);border-radius:12px;';
      
      let statusText = '';
      let statusIcon = '';
      if (isArchived) {
        statusText = 'Surat ini telah divalidasi dan masuk ke Arsip';
        statusIcon = 'bi-archive-fill';
      } else if (status === 'disposisi_to_sekretaris') {
        statusText = 'Surat ini sedang diproses oleh Sekretaris';
        statusIcon = 'bi-envelope-paper';
      } else if (status === 'disposisi_to_pendeta') {
        statusText = 'Surat ini sedang diproses oleh Pendeta';
        statusIcon = 'bi-person-badge';
      }
      
      alertDiv.innerHTML = `
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:48px;height:48px;background:#0d6efd;border-radius:50%;display:flex;align-items:center;justify-content:center;">
            <i class="bi ${statusIcon}" style="font-size:24px;color:#fff;"></i>
          </div>
          <div>
            <h6 style="color:#084298;margin:0 0 4px 0;font-weight:700;"><i class="bi bi-info-circle-fill"></i> Mode Tampilan Saja</h6>
            <p style="color:#084298;margin:0;font-size:0.95rem;">${escapeHtml(statusText)}. Detail surat hanya dapat dilihat.</p>
          </div>
        </div>
      `;
      
      const main = document.querySelector('main.container');
      if (main && main.firstChild) {
        main.insertBefore(alertDiv, main.firstChild);
      }
    }
    
    // Set initial status badge
    const statusBadge = qs('status-badge');
    if (statusBadge){
      if (status === 'terverifikasi' || status === 'verifikasi'){
        statusBadge.classList.add('status-verified');
        statusBadge.innerHTML = '<i class="bi bi-check-circle-fill"></i> <span>Terverifikasi</span>';
      } else if (status === 'disposisi_to_tatausaha'){
        statusBadge.classList.remove('status-verified');
        statusBadge.classList.add('status-pending');
        statusBadge.innerHTML = '<i class="bi bi-arrow-return-left"></i> <span>Dikembalikan</span>';
      } else if (status === 'disposisi_to_sekretaris'){
        statusBadge.innerHTML = '<i class="bi bi-envelope-paper"></i> <span>Di Sekretaris</span>';
      } else if (status === 'disposisi_to_pendeta'){
        statusBadge.innerHTML = '<i class="bi bi-person-badge"></i> <span>Di Pendeta</span>';
      } else if (isArchived){
        statusBadge.innerHTML = '<i class="bi bi-archive-fill"></i> <span>Terarsip</span>';
      } else {
        statusBadge.innerHTML = '<i class="bi bi-hourglass-split"></i> <span>' + escapeHtml(item.status || 'Menunggu') + '</span>';
      }
    }
    
    // Merge form data to top level for easier display
    // Backend stores form fields in nested 'form' object, flatten it
    if (item.form && typeof item.form === 'object') {
      console.log('📋 Merging nested form data to top level');
      Object.assign(item, item.form);
    }
    
    renderDetail(item);
    await renderFilePreview(item);
    renderTimeline(item);
    
    // Check if nomor surat exists and control upload button state
    // This must be AFTER form data merge
    const hasNomorSurat = !!(item.nomor || item.nomor_surat);
    const uploadBtn = qs('file-upload');
    const uploadZone = qs('upload-zone');
    
    if (!hasNomorSurat) {
      // Disable upload if no nomor surat
      if (uploadBtn) {
        uploadBtn.disabled = true;
      }
      if (uploadZone) {
        uploadZone.classList.add('disabled');
        uploadZone.style.opacity = '0.5';
        uploadZone.style.pointerEvents = 'none';
        uploadZone.title = 'Simpan nomor surat terlebih dahulu';
      }
      console.log('⚠️ Upload disabled: Nomor surat belum diisi');
    } else {
      // Enable upload if nomor surat exists
      if (uploadBtn) {
        uploadBtn.disabled = false;
      }
      if (uploadZone) {
        uploadZone.classList.remove('disabled');
        uploadZone.style.opacity = '1';
        uploadZone.style.pointerEvents = 'auto';
        uploadZone.title = '';
      }
      console.log('✅ Upload enabled: Nomor surat sudah diisi');
    }
    
    // Wire save nomor surat button
    const btnSaveNomor = qs('btn-save-nomor');
    if (btnSaveNomor) {
      btnSaveNomor.addEventListener('click', () => {
        saveNomorSurat(window.currentItem);
      });
    }
    
    // Allow save with Enter key in input
    const inputNomor = qs('input-nomor-surat');
    if (inputNomor) {
      inputNomor.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveNomorSurat(window.currentItem);
        }
      });
    }

    // Wire upload and disposisi only if NOT in read-only mode
    if (!isReadOnly) {
      // Set initial state of disposisi button based on file existence
      const hasFile = !!(item.final_file_data || item.final_file);
      updateDisposisiButton(hasFile);
      
      // Wire upload
      if (upload){
        upload.addEventListener('change', async () => {
          const updatedItem = await handleUpload(window.currentItem);
          if (updatedItem) {
            window.currentItem = updatedItem;
            // Update button state after successful upload
            updateDisposisiButton(true);
          }
        });
      }
      
      // Drag and drop support for upload zone
      const uploadZoneEl = qs('upload-zone');
      if (uploadZoneEl){
        uploadZoneEl.addEventListener('dragover', (e) => {
          e.preventDefault();
          uploadZoneEl.classList.add('dragover');
        });
        
        uploadZoneEl.addEventListener('dragleave', () => {
          uploadZoneEl.classList.remove('dragover');
        });
        
        uploadZoneEl.addEventListener('drop', async (e) => {
          e.preventDefault();
          uploadZoneEl.classList.remove('dragover');
          
          const files = e.dataTransfer.files;
          if (files && files.length > 0){
            upload.files = files;
            const updatedItem = await handleUpload(window.currentItem);
            if (updatedItem) {
              window.currentItem = updatedItem;
              // Update button state after successful upload
              updateDisposisiButton(true);
            }
          }
        });
      }


      wireDisposisi(item);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
