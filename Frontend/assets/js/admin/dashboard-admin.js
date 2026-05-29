// Dashboard Admin - Rekapitulasi akun
(function(){
  const qs = id => document.getElementById(id);

  async function loadUsers(){
    try {
      return await API.users.getAll();
    } catch (error) {
      console.error('Failed to load users:', error);
      return [];
    }
  }

  function countByRole(users, role){
    return users.filter(u => u && u.role === role).length;
  }

  function animateCount(el, target){
    if (!el) return;
    let current = 0;
    const step = Math.ceil(target / 20);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = current;
    }, 30);
  }

  async function renderRecent(){
    const users = await loadUsers();
    const recent = users.slice(-5).reverse();
    const tbody = qs('recent-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (!recent || recent.length === 0){
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Belum ada akun terdaftar</td></tr>';
      return;
    }

    recent.forEach((user, idx) => {
      const tr = document.createElement('tr');
      const roleBadge = getRoleBadge(user.role);
      const createdAt = user.createdAt || user.created_at ? new Date(user.createdAt || user.created_at).toLocaleDateString('id-ID') : '-';
      const userId = user._id || user.id;
      
      tr.innerHTML = `
        <td data-label="No">${idx+1}</td>
        <td data-label="Email">${escapeHtml(user.email||'-')}</td>
        <td data-label="Role">${roleBadge}</td>
        <td data-label="Tanggal">${createdAt}</td>
        <td data-label="Aksi">
          <a href="account-detail.html?id=${userId}" class="btn btn-sm btn-outline-primary">
            <i class="bi bi-eye"></i><span class="d-none d-md-inline"> Detail</span>
          </a>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function getRoleBadge(role){
    const badges = {
      'jemaat': '<span class="badge bg-primary">Jemaat</span>',
      'koordinator': '<span class="badge bg-purple">Koordinator</span>',
      'tatausaha': '<span class="badge bg-warning">Tata Usaha</span>',
      'sekretaris': '<span class="badge bg-info">Sekretaris</span>',
      'pendeta': '<span class="badge bg-success">Pendeta</span>',
      'admin': '<span class="badge bg-danger">Admin</span>'
    };
    return badges[role] || '<span class="badge bg-secondary">-</span>';
  }

  function escapeHtml(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  async function refresh(){
    const users = await loadUsers();
    
    animateCount(qs('count-jemaat'), countByRole(users, 'jemaat'));
    animateCount(qs('count-koordinator'), countByRole(users, 'koordinator'));
    animateCount(qs('count-tatausaha'), countByRole(users, 'tatausaha'));
    animateCount(qs('count-sekretaris'), countByRole(users, 'sekretaris'));
    animateCount(qs('count-pendeta'), countByRole(users, 'pendeta'));
    
    await renderRecent();
  }

  function wireStatClicks(){
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        window.location.href = 'accounts.html';
      });
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    refresh();
    wireStatClicks();
  });

})();
