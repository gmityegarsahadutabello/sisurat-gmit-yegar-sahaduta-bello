// Dashboard logic for Tata Usaha: compute rekap counts and render recent items
(function(){
  const qs = id => document.getElementById(id);

  async function loadAll(){
    try {
        // Try API first
        let all = await API.pengajuan.getAll();
        
        // If API returns empty or undefined, try localStorage as fallback
        if (!all || all.length === 0) {
            console.warn('API returned empty, trying localStorage fallback...');
            if (typeof LS !== 'undefined' && LS.loadArray) {
                all = await LS.loadArray('local_pengajuan') || [];
            }
        }
        
        return all.filter(i => {
            const s = String((i && i.status) || '').toLowerCase();
            return s !== 'ditolak' && s !== 'rejected';
        });
    } catch(e) {
        console.error("Failed to load from API, trying localStorage...", e);
        // Fallback to localStorage if API fails
        if (typeof LS !== 'undefined' && LS.loadArray) {
            const all = await LS.loadArray('local_pengajuan') || [];
            return all.filter(i => {
                const s = String((i && i.status) || '').toLowerCase();
                return s !== 'ditolak' && s !== 'rejected';
            });
        }
        return [];
    }
  }

  function countMasuk(all){
    // Surat yang sudah diverifikasi koordinator TAPI belum didisposisikan dan belum masuk arsip
    // Logic HARUS sama dengan daftar-terverifikasi.js
    return all.filter(i => {
      if (!i) return false;
      const status = String(i.status || '').toLowerCase();
      // Hanya tampilkan yang sudah diverifikasi koordinator
      // Status 'diterima' is what Koordinator sets when verifying
      // Also include 'disposisi_to_tatausaha' (returned from Sekretaris/Pendeta)
      const isVerified = (status === 'diterima' || status === 'disposisi_to_tatausaha');
      
      return isVerified;
    }).length;
  }

  function countDisposisi(all){
    // disposisi in-progress: sent to sekretaris or pendeta
    return all.filter(i => i && (i.status === 'disposisi_to_sekretaris' || i.status === 'disposisi_to_pendeta')).length;
  }

  function countArsip(all){
    // Count archived items: validated, archived, or validated_by_pendeta
    return all.filter(i => {
      if (!i) return false;
      const status = String(i.status || '').toLowerCase();
      return status === 'validated' || 
             status === 'archived' || 
             status === 'validated_by_pendeta' ||
             i.validated === true ||
             i.archived === true;
    }).length;
  }

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
    console.log('📊 Dashboard Tatausaha - Total pengajuan loaded:', all.length);
    
    const masukCount = countMasuk(all);
    const disposisiCount = countDisposisi(all);
    const arsipCount = countArsip(all);
    
    console.log('📊 Dashboard counts:', {
      masuk: masukCount,
      disposisi: disposisiCount,
      arsip: arsipCount
    });
    
    // Debug: Show sample archived items
    const archivedItems = all.filter(i => {
      if (!i) return false;
      const status = String(i.status || '').toLowerCase();
      return status === 'validated' || 
             status === 'archived' || 
             status === 'validated_by_pendeta' ||
             i.validated === true ||
             i.archived === true;
    });
    console.log('📦 Archived items:', archivedItems.length, archivedItems.map(i => ({
      id: i.id || i._id,
      status: i.status,
      validated: i.validated,
      archived: i.archived
    })));
    
    animateCount(qs('count-masuk'), masukCount);
    animateCount(qs('count-disposisi'), disposisiCount);
    animateCount(qs('count-arsip'), arsipCount);
  }

  function wireStatClicks(){
    const cards = document.querySelectorAll('.stat-card');
    if (!cards || !cards.length) return;
    // map first->masuk, second->disposisi, third->arsip
    if (cards[0]) cards[0].style.cursor='pointer', cards[0].addEventListener('click', ()=> window.location.href='daftar-terverifikasi.html');
    if (cards[1]) cards[1].style.cursor='pointer', cards[1].addEventListener('click', ()=> window.location.href='daftar-disposisi.html');
    if (cards[2]) cards[2].style.cursor='pointer', cards[2].addEventListener('click', ()=> window.location.href='arsip.html');
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    refresh();
    wireStatClicks();
    // window.addEventListener('storage', refresh); // Not needed with API
  });

})();
