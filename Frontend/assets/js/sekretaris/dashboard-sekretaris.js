// Dashboard logic for Sekretaris: compute rekap counts and render recent items
(function(){
  const qs = id => document.getElementById(id);

  async function loadAll(){
    try {
      const all = await API.pengajuan.getAll({ role: 'sekretaris' });
      console.log('📊 Dashboard sekretaris loaded items:', Array.isArray(all) ? all.length : 0);
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
    // surat disposisi yang masuk ke sekretaris untuk divalidasi
    // Status: 'disposisi_to_sekretaris' AND must have uploaded file
    // Match the same filter logic as daftar-masuk.js
    return all.filter(i => {
      if (!i || i.status !== 'disposisi_to_sekretaris') return false;
      // Check if file exists (same structures as daftar-masuk.js)
      const hasFile = !!(
        i.final_file_data || 
        i.final_file || 
        (i.files && i.files.final && (i.files.final.data || i.files.final.name)) ||
        i.final_file_url
      );
      return hasFile;
    }).length;
  }

  function countDisposisi(all){
    // surat yang telah diteruskan oleh sekretaris (forwarded to pendeta or completed)
    // Match the same filter logic as daftar-disposisi.js
    return all.filter(i => {
      if (!i) return false;
      const s = String(i.status || '').toLowerCase();
      return (
        s === 'disposisi_to_pendeta' ||
        s === 'validated_by_pendeta' || 
        s === 'validated' || 
        s === 'archived' || 
        s === 'surat_dibuat' || 
        i.validated === true
      );
    }).length;
  }

  function renderRecent(all){
    const tbody = qs('recent-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Sort by updated_at or created_at
    const sorted = all.filter(Boolean).sort((a,b)=> (new Date(b.updated_at||b.created_at||0)) - (new Date(a.updated_at||a.created_at||0)) ).slice(0,10);
    
    if (!sorted.length){
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="6" class="no-data">Belum ada data</td>';
      tbody.appendChild(tr); return;
    }
    
    sorted.forEach((it, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx+1}</td>
        <td>${escapeHtml(it.nomor_surat||it.nomor||'—')}</td>
        <td>${escapeHtml(it.jenis||it.type||'—')}</td>
        <td>${escapeHtml(it.user_nama||it.pemohon_nama||it.nama||'—')}</td>
        <td>${escapeHtml(it.status||'—')}</td>
        <td><a class="btn btn-sm btn-outline-primary" href="detail-preview.html?id=${encodeURIComponent(it.id||it._id)}">Detail</a></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function animateCount(el, target){
    if (!el) return;
    const start = parseInt(el.textContent.replace(/[^0-9]/g,'')) || 0;
    const end = parseInt(target) || 0;
    const duration = 600; // ms
    const frameRate = 30;
    const totalFrames = Math.round(duration / (1000 / frameRate));
    let frame = 0;
    const diff = end - start;
    const raf = setInterval(()=>{
      frame++;
      const progress = frame / totalFrames;
      const value = Math.round(start + diff * progress);
      el.textContent = value;
      if (frame >= totalFrames){ el.textContent = end; clearInterval(raf); }
    }, Math.round(1000 / frameRate));
  }

  async function refresh(){
    const all = await loadAll();
    animateCount(qs('count-masuk'), countMasuk(all));
    animateCount(qs('count-disposisi'), countDisposisi(all));
    renderRecent(all);
  }

  function wireStatClicks(){
    const cards = document.querySelectorAll('.stat-card');
    if (!cards || !cards.length) return;
    // map first->masuk, second->disposisi
    if (cards[0]) cards[0].style.cursor='pointer', cards[0].addEventListener('click', ()=> window.location.href='daftar-masuk.html');
    if (cards[1]) cards[1].style.cursor='pointer', cards[1].addEventListener('click', ()=> window.location.href='daftar-disposisi.html');
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    refresh();
    wireStatClicks();
    // window.addEventListener('storage', refresh); // Not needed with API
  });

})();
