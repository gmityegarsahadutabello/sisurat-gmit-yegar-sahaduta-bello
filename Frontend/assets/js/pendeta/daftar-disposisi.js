// Pendeta - daftar surat tervalidasi (read-only, hanya untuk melihat surat yang sudah divalidasi)
(function(){
  function qs(id){ return document.getElementById(id); }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  let allData = [];
  let filteredData = [];

  async function loadList(){
    let all = [];
    try {
        all = await API.pengajuan.getAll();
        console.log('📊 Loaded validated items:', Array.isArray(all) ? all.length : 0);
    } catch(e) {
        console.error("Failed to load pengajuan", e);
        all = [];
    }
    
    return all.filter(i => {
      if (!i) return false;
      const s = String(i.status||'').toLowerCase();
      return (
        s === 'validated' || 
        s === 'archived' || 
        s === 'validated_by_pendeta' ||
        s === 'surat_dibuat' ||
        i.validated === true || 
        i.validated_by_pendeta === true
      );
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

  function rowFor(item, idx){
    const tr = document.createElement('tr');
    const waktu = formatDateTime(item.validated_at || item.updated_at || item.created_at || item.createdAt);
    const nomor = item.nomor_surat || item.nomor || item.number || '—';
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td><i class="bi bi-calendar-check" style="color:#667eea;margin-right:6px;"></i> ${waktu}</td>
      <td><strong>${esc(nomor)}</strong></td>
      <td>${esc(item.jenis||item.type||'—')}</td>
      <td>${esc(item.user_nama||item.pemohon_nama||item.nama||item.name||item.pemohon||'—')}</td>
      <td class="text-center">
        <a class="btn-detail" href="detail-preview.html?id=${encodeURIComponent(item.id||item._id)}">
          <i class="bi bi-eye"></i> Detail
        </a>
      </td>
    `;
    tr.style.animation = `fadeInRow 0.3s ease ${idx * 0.05}s backwards`;
    return tr;
  }

  function render(list){
    const tbody = qs('list-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!list || list.length === 0){
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">
        <i class="bi bi-inbox"></i>
        <div class="empty-title">Tidak ada surat yang ditemukan</div>
        <div class="empty-text">Surat yang sudah divalidasi akan muncul di sini</div>
      </td></tr>`;
      updateResultCount(0);
      return;
    }
    
    list.forEach((item, idx) => tbody.appendChild(rowFor(item, idx)));
    updateResultCount(list.length);
  }

  function updateResultCount(count){
    const countEl = qs('result-count');
    if (countEl) {
      countEl.textContent = `Menampilkan ${count} surat`;
    }
  }

  function updateStatistics(data){
    // Total validated
    const totalEl = qs('total-validated');
    if (totalEl) {
      animateCount(totalEl, data.length);
    }

    // This month
    const now = new Date();
    const thisMonth = data.filter(i => {
      const date = new Date(i.validated_at || i.updated_at || i.created_at);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    const monthEl = qs('this-month');
    if (monthEl) animateCount(monthEl, thisMonth);

    // This week
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = data.filter(i => {
      const date = new Date(i.validated_at || i.updated_at || i.created_at);
      return date >= oneWeekAgo;
    }).length;
    const weekEl = qs('this-week');
    if (weekEl) animateCount(weekEl, thisWeek);
  }

  function animateCount(el, target){
    if (!el) return;
    const duration = 800;
    const start = 0;
    const end = target;
    const startTime = performance.now();

    function update(currentTime){
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(start + (end - start) * easeOut);
      el.textContent = value;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function populateJenisFilter(data){
    const filterJenis = qs('filter-jenis');
    if (!filterJenis) return;

    const jenisSet = new Set();
    data.forEach(i => {
      const jenis = i.jenis || i.type;
      if (jenis) jenisSet.add(jenis);
    });

    const sortedJenis = Array.from(jenisSet).sort();
    sortedJenis.forEach(jenis => {
      const option = document.createElement('option');
      option.value = jenis;
      option.textContent = jenis;
      filterJenis.appendChild(option);
    });
  }

  async function applyFilters(){
    const search = (qs('search')?.value||'').toLowerCase();
    const filterMonth = qs('filter-month')?.value || '';
    const filterJenis = qs('filter-jenis')?.value || '';

    let filtered = allData;

    // Search filter
    if (search){
      filtered = filtered.filter(i => {
        const nomor = (i.nomor_surat||i.nomor||i.number||'').toLowerCase();
        const nama = (i.user_nama||i.pemohon_nama||i.nama||i.name||i.pengaju||'').toLowerCase();
        const tipe = (i.jenis||i.type||'').toLowerCase();
        return nomor.includes(search) || nama.includes(search) || tipe.includes(search);
      });
    }

    // Month filter
    if (filterMonth){
      const now = new Date();
      filtered = filtered.filter(i => {
        const date = new Date(i.validated_at || i.updated_at || i.created_at);
        
        if (filterMonth === 'this-month') {
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        } else if (filterMonth === 'last-month') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
        } else if (filterMonth === 'this-year') {
          return date.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // Jenis filter
    if (filterJenis){
      filtered = filtered.filter(i => {
        const jenis = i.jenis || i.type || '';
        return jenis === filterJenis;
      });
    }

    filteredData = filtered;
    render(filtered);
  }

  async function loadAndRender(){
    allData = await loadList();
    filteredData = allData;
    populateJenisFilter(allData);
    render(allData);
  }

  function resetFilters(){
    const searchEl = qs('search');
    const filterMonthEl = qs('filter-month');
    const filterJenisEl = qs('filter-jenis');
    
    if (searchEl) searchEl.value = '';
    if (filterMonthEl) filterMonthEl.value = '';
    if (filterJenisEl) filterJenisEl.value = '';
    
    render(allData);
  }

  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInRow {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', ()=>{
    loadAndRender();
    
    const searchEl = qs('search');
    const filterMonthEl = qs('filter-month');
    const filterJenisEl = qs('filter-jenis');
    const refreshBtn = qs('btn-refresh');
    const resetBtn = qs('btn-reset');

    if (searchEl) searchEl.addEventListener('input', applyFilters);
    if (filterMonthEl) filterMonthEl.addEventListener('change', applyFilters);
    if (filterJenisEl) filterJenisEl.addEventListener('change', applyFilters);
    if (refreshBtn) refreshBtn.addEventListener('click', loadAndRender);
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
  });

})();
