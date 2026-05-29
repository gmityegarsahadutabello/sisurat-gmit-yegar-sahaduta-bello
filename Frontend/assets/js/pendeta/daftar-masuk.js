// ===================================
// PENDETA - DAFTAR SURAT MASUK
// Enhanced with filters & animations
// ===================================

(function(){
  function qs(id){ return document.getElementById(id); }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  
  function fmtDateTime(ts){
    try {
      const d = new Date(ts);
      if (isNaN(d)) return '-';
      return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) + 
             ', ' + d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    } catch(e){ return ts || '-'; }
  }

  let allData = [];
  let filteredData = [];

  // Load all pending letters
  async function loadList(){
    let list = [];
    try {
      const all = await API.pengajuan.getAll();
      list = all.filter(i => i && i.status === 'disposisi_to_pendeta');
    } catch(e) {
      console.error("Failed to load pengajuan", e);
      list = [];
    }
    return list;
  }

  // Populate jenis filter
  function populateJenisFilter(data) {
    const jenisSet = new Set();
    data.forEach(item => {
      const jenis = item.jenis || item.type;
      if (jenis) jenisSet.add(jenis);
    });
    
    const select = qs('filter-jenis');
    if (!select) return;
    
    // Keep "Semua Jenis" option
    select.innerHTML = '<option value="">Semua Jenis</option>';
    
    // Add unique jenis
    Array.from(jenisSet).sort().forEach(jenis => {
      const option = document.createElement('option');
      option.value = jenis;
      option.textContent = jenis;
      select.appendChild(option);
    });
  }

  // Apply all filters
  function applyFilters() {
    const searchVal = (qs('search')?.value || '').toLowerCase();
    const monthVal = qs('filter-month')?.value || '';
    const jenisVal = qs('filter-jenis')?.value || '';

    filteredData = allData.filter(item => {
      // Search filter
      if (searchVal) {
        const nama = (item.user_nama || item.pemohon_nama || item.nama || '').toLowerCase();
        const jenis = (item.jenis || item.type || '').toLowerCase();
        const nomor = (item.nomor || '').toLowerCase();
        if (!nama.includes(searchVal) && !jenis.includes(searchVal) && !nomor.includes(searchVal)) {
          return false;
        }
      }

      // Month filter
      if (monthVal) {
        const itemDate = new Date(item.updated_at || item.created_at || item.createdAt);
        const now = new Date();
        
        if (monthVal === 'current') {
          if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (monthVal === 'last') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          if (itemDate.getMonth() !== lastMonth.getMonth() || itemDate.getFullYear() !== lastMonth.getFullYear()) {
            return false;
          }
        } else if (monthVal === 'year') {
          if (itemDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      // Jenis filter
      if (jenisVal) {
        const itemJenis = item.jenis || item.type || '';
        if (itemJenis !== jenisVal) {
          return false;
        }
      }

      return true;
    });

    render(filteredData);
    updateResultCount();
  }

  // Update result count
  function updateResultCount() {
    const countEl = qs('result-count');
    if (!countEl) return;
    
    const total = allData.length;
    const showing = filteredData.length;
    
    if (total === 0) {
      countEl.textContent = 'Tidak ada surat masuk';
    } else if (showing === total) {
      countEl.textContent = `Menampilkan ${total} surat`;
    } else {
      countEl.textContent = `Menampilkan ${showing} dari ${total} surat`;
    }
  }

  // Create table row
  function rowFor(item, index){
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${index * 0.05}s`;
    
    tr.innerHTML = `
      <td>${fmtDateTime(item.updated_at || item.created_at || item.createdAt)}</td>
      <td><strong>${esc(item.jenis || item.type || '-')}</strong></td>
      <td>${esc(item.user_nama || item.pemohon_nama || item.nama || item.name || item.pemohon || '-')}</td>
      <td>
        <span class="status-badge waiting">
          <i class="bi bi-hourglass-split"></i>
          Menunggu Pemeriksaan
        </span>
      </td>
      <td class="text-center">
        <button class="btn-action btn-preview" data-id="${item.id || item._id}">
          <i class="bi bi-eye-fill"></i>
          Lihat Detail
        </button>
      </td>
    `;
    return tr;
  }

  // Render table
  function render(list){
    const tbody = qs('list-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!list || list.length === 0){
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <i class="bi bi-inbox"></i>
              <p>Tidak ada surat yang sesuai dengan filter</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    list.forEach((item, index) => tbody.appendChild(rowFor(item, index)));

    // Wire preview buttons
    tbody.querySelectorAll('.btn-preview').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        window.location.href = `detail-preview.html?id=${id}`;
      });
    });
  }

  // Reset filters
  function resetFilters() {
    if (qs('search')) qs('search').value = '';
    if (qs('filter-month')) qs('filter-month').value = '';
    if (qs('filter-jenis')) qs('filter-jenis').value = '';
    applyFilters();
  }

  // Load and render
  async function loadAndRender(){
    allData = await loadList();
    filteredData = [...allData];
    populateJenisFilter(allData);
    render(filteredData);
    updateResultCount();
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', ()=>{
    loadAndRender();
    
    // Event listeners
    qs('search')?.addEventListener('input', applyFilters);
    qs('filter-month')?.addEventListener('change', applyFilters);
    qs('filter-jenis')?.addEventListener('change', applyFilters);
    qs('btn-reset')?.addEventListener('click', resetFilters);
    qs('btn-refresh')?.addEventListener('click', loadAndRender);
  });

})();
