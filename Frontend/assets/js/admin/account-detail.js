// Admin - Account Detail View
(function(){
  const qs = id => document.getElementById(id);
  
  function getIdFromUrl(){
    return (new URLSearchParams(window.location.search)).get('id');
  }

  function escapeHtml(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function getRoleBadge(role){
    const badges = {
      'jemaat': '<span class="badge bg-primary">Jemaat</span>',
      'koordinator': '<span class="badge bg-info text-dark">Koordinator</span>',
      'tatausaha': '<span class="badge bg-warning text-dark">Tata Usaha</span>',
      'sekretaris': '<span class="badge bg-secondary">Sekretaris</span>',
      'pendeta': '<span class="badge bg-success">Pendeta</span>',
      'admin': '<span class="badge bg-danger">Administrator</span>'
    };
    return badges[role] || '<span class="badge bg-secondary">-</span>';
  }

  function formatDate(dateStr){
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('id-ID', {
        dateStyle: 'long',
        timeStyle: 'short'
      });
    } catch(e){
      return dateStr;
    }
  }

  async function loadUser(id){
    try {
      const users = await API.users.getAll();
      return users.find(u => (u._id || u.id) === id);
    } catch (e) {
      console.error('Failed to load user:', e);
      return null;
    }
  }

  function renderDetail(user){
    if (!user){
      alert('Akun tidak ditemukan');
      window.location.href = 'accounts.html';
      return;
    }

    qs('detail-nama').textContent = user.nama || user.name || '-';
    qs('detail-email').textContent = user.email || '-';
    qs('detail-nik').textContent = user.nik || '-';
    qs('detail-role').innerHTML = getRoleBadge(user.role);
    qs('detail-created').textContent = formatDate(user.created_at || user.createdAt);
    qs('detail-updated').textContent = formatDate(user.updated_at || user.updatedAt);
    
    // Show rayon field only for jemaat and koordinator
    const rayonField = document.getElementById('rayon-field');
    if (rayonField && user.rayon) {
      rayonField.style.display = 'block';
      qs('detail-rayon').textContent = 'Rayon ' + user.rayon;
    } else if (rayonField) {
      rayonField.style.display = 'none';
    }
  }

  async function deleteUser(id){
    if (!confirm('Apakah Anda yakin ingin menghapus akun ini?')) return;

    try {
      await API.users.delete(id);
      alert('Akun berhasil dihapus');
      window.location.href = 'accounts.html';
    } catch (e) {
      console.error('Failed to delete user:', e);
      alert('Gagal menghapus akun: ' + (e.message || 'Unknown error'));
    }
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    const id = getIdFromUrl();
    if (!id){
      alert('ID tidak ditemukan');
      window.location.href = 'accounts.html';
      return;
    }

    const user = await loadUser(id);
    renderDetail(user);

    // Wire buttons
    qs('btn-edit')?.addEventListener('click', () => {
      // encode id when redirecting so special characters won't break the query string
      window.location.href = `accounts.html?edit=${encodeURIComponent(id)}`;
    });

    qs('btn-delete')?.addEventListener('click', () => {
      deleteUser(id);
    });
  });

})();
