// Sekretaris - daftar disposisi
// Menampilkan surat yang sudah diteruskan ke Pendeta (in-progress)
// dan yang sudah selesai (divalidasi final oleh Pendeta)
(function(){
  function qs(id){ return document.getElementById(id); }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  async function loadList(){
    let all = [];
    try {
      all = await API.pengajuan.getAll({ role: 'sekretaris' });
      console.log('📥 Loaded disposisi list for sekretaris:', Array.isArray(all) ? all.length : 0);
    } catch(e) {
        console.error("Failed to load pengajuan", e);
        all = [];
    }
    
    return all.filter(i => {
      if (!i) return false;
      const s = String(i.status||'').toLowerCase();
      return (
        s === 'disposisi_to_pendeta' ||
        s === 'validated_by_pendeta' || s === 'validated' || s === 'archived' || s === 'surat_dibuat' || i.validated === true
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

  function statusBadge(item){
    const s = String(item.status||'').toLowerCase();
    if (s === 'validated_by_pendeta' || s === 'validated' || s === 'archived' || s === 'surat_dibuat' || item.validated === true) {
      return '<span class="badge bg-success">Selesai</span>';
    }
    if (s === 'disposisi_to_pendeta') {
      return '<span class="badge bg-warning text-dark">Diproses</span>';
    }
    if (s === 'disposisi_to_tatausaha') {
      return '<span class="badge bg-danger">Dikembalikan</span>';
    }
    return `<span class="badge bg-secondary">${esc(item.status||'—')}</span>`;
  }

  function rowFor(item, idx){
    const tr = document.createElement('tr');
    const waktu = formatDateTime(item.updated_at || item.validated_at || item.created_at || item.createdAt);
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${waktu}</td>
      <td>${esc(item.nomor_surat||item.nomor||item.no||'—')}</td>
      <td>${esc(item.jenis||item.type||'—')}</td>
      <td>${esc(item.user_nama||item.pemohon_nama||item.nama||item.pengaju||item.name||'—')}</td>
      <td>${statusBadge(item)}</td>
      <td>
        <a class="btn btn-sm btn-outline-primary" href="detail-preview.html?id=${encodeURIComponent(item.id||item._id)}">Detail</a>
      </td>
    `;
    return tr;
  }

  function render(list){
    const tbody = qs('list-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!list || !list.length){
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="7" class="no-data">Belum ada surat yang divalidasi</td>';
      tbody.appendChild(tr);
      return;
    }
    list.forEach((item, idx) => tbody.appendChild(rowFor(item, idx)));
  }

  async function applyFilters(){
    const all = await loadList();
    const search = (qs('search')?.value || '').toLowerCase();
    const status = qs('filter-status')?.value || '';

    let filtered = all;
    if (search){
      filtered = filtered.filter(i => {
        const nomor = (i.nomor_surat||i.nomor||i.no||'').toLowerCase();
        const nama = (i.user_nama||i.pemohon_nama||i.nama||i.pengaju||i.name||'').toLowerCase();
        const tipe = (i.jenis||i.type||'').toLowerCase();
        return nomor.includes(search) || nama.includes(search) || tipe.includes(search);
      });
    }
    if (status){
      filtered = filtered.filter(i => {
        const s = String(i.status||'').toLowerCase();
        if (status === 'in_progress') return s === 'disposisi_to_pendeta';
        if (status === 'finished') return (s === 'validated_by_pendeta' || s === 'validated' || s === 'archived' || s === 'surat_dibuat' || i.validated === true);
        return true;
      });
    }
    render(filtered);
  }

  async function loadAndRender(){
    const list = await loadList();
    render(list);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    loadAndRender();
    const search = qs('search');
    const filter = qs('filter-status');
    const btnRefresh = qs('btn-refresh');
    
    if (search) search.addEventListener('input', applyFilters);
    if (filter) filter.addEventListener('change', applyFilters);
    if (btnRefresh) btnRefresh.addEventListener('click', loadAndRender);
    // window.addEventListener('storage', loadAndRender); // Not needed with API
  });

})();
