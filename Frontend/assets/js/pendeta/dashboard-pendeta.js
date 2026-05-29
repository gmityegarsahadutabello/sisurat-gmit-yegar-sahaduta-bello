// Dashboard logic for Pendeta: compute rekap counts and render recent items
(function(){
  const qs = id => document.getElementById(id);

  async function loadAll(){
    try {
        const all = await API.pengajuan.getAll();
        console.log('📊 Dashboard pendeta loaded items:', Array.isArray(all) ? all.length : 0);
        return all.filter(i => {
            const s = String((i && i.status) || '').toLowerCase();
            return s !== 'ditolak' && s !== 'rejected';
        });
    } catch(e) {
        console.error("Failed to load pengajuan", e);
        return [];
    }
  }

  function countMasuk(all){
    return all.filter(i => i && i.status === 'disposisi_to_pendeta').length;
  }

  function countDisposisi(all){
    // Count hanya surat yang sudah tervalidasi (archived/validated)
    return all.filter(i => {
      if (!i) return false;
      const s = String(i.status || '').toLowerCase();
      return (
        s === 'validated' || 
        s === 'archived' || 
        s === 'validated_by_pendeta' ||
        s === 'surat_dibuat' ||
        i.validated === true || 
        i.validated_by_pendeta === true
      );
    }).length;
  }

  function renderRecent(all){
    const tbody = qs('recent-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Sort by updated_at or created_at, take 5 most recent
    const sorted = all.filter(Boolean).sort((a,b)=> (new Date(b.updated_at||b.created_at||0)) - (new Date(a.updated_at||a.created_at||0)) ).slice(0,5);
    
    if (!sorted.length){
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="7" class="no-data">Belum ada aktivitas terbaru</td>';
      tbody.appendChild(tr);
      return;
    }
    
    sorted.forEach((it, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx+1}</td>
        <td>${formatDateTime(it.updated_at||it.created_at)}</td>
        <td>${escapeHtml(it.nomor_surat||it.nomor||'—')}</td>
        <td>${escapeHtml(it.jenis||it.type||'—')}</td>
        <td>${escapeHtml(it.user_nama||it.pemohon_nama||it.nama||'—')}</td>
        <td>${statusBadge(it)}</td>
        <td><a class="btn-detail" href="detail-preview.html?id=${encodeURIComponent(it.id||it._id)}">Detail</a></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function formatDateTime(dt){
    if (!dt) return '—';
    try {
      const d = new Date(dt);
      const date = d.toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'});
      const time = d.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'});
      return `${date} ${time}`;
    } catch(e){ return '—'; }
  }

  function statusBadge(item){
    const s = String(item.status||'').toLowerCase();
    if (s === 'validated_by_pendeta' || s === 'validated' || s === 'archived' || s === 'surat_dibuat' || item.validated === true) {
      return '<span class="badge bg-success">Selesai</span>';
    }
    if (s === 'disposisi_to_pendeta') {
      return '<span class="badge bg-warning">Menunggu</span>';
    }
    if (s === 'disposisi_to_sekretaris') {
      return '<span class="badge bg-info">Di Sekretaris</span>';
    }
    if (s === 'disposisi_to_tatausaha') {
      return '<span class="badge bg-secondary">Di Tata Usaha</span>';
    }
    if (s === 'ditolak' || s === 'rejected') {
      return '<span class="badge bg-danger">Ditolak</span>';
    }
    return `<span class="badge bg-secondary">${escapeHtml(item.status||'—')}</span>`;
  }

  function escapeHtml(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function animateCount(el, target){
    if (!el) return;
    const start = parseInt(el.textContent.replace(/[^0-9]/g,'')) || 0;
    const end = parseInt(target) || 0;
    const duration = 1000; // ms
    const frameRate = 60;
    const totalFrames = Math.round(duration / (1000 / frameRate));
    let frame = 0;
    const diff = end - start;
    
    const raf = setInterval(()=>{
      frame++;
      const progress = frame / totalFrames;
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const value = Math.round(start + diff * easeOutQuart);
      el.textContent = value;
      
      if (frame >= totalFrames){ 
        el.textContent = end; 
        clearInterval(raf); 
      }
    }, Math.round(1000 / frameRate));
  }

  async function refresh(){
    const all = await loadAll();
    animateCount(qs('count-masuk'), countMasuk(all));
    animateCount(qs('count-disposisi'), countDisposisi(all));
  }

  function wireStatClicks(){
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach(card => {
      const type = card.getAttribute('data-card');
      
      // Add ripple effect on click
      card.addEventListener('click', function(e){
        const ripple = this.querySelector('.stat-card-ripple');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        // Navigate after ripple
        setTimeout(() => {
          if (type === 'masuk') {
            window.location.href = 'daftar-masuk.html';
          } else if (type === 'disposisi') {
            window.location.href = 'daftar-disposisi.html';
          }
        }, 200);
      });
      
      // Prevent double-click navigation
      card.addEventListener('dblclick', e => e.preventDefault());
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    refresh();
    wireStatClicks();
  });

})();
