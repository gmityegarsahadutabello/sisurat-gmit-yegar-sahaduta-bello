// Navbar behavior for Tata Usaha pages
(function(){
  function getCurrentUserName(){
    try { const raw = localStorage.getItem('currentUser'); if (!raw) return null; const u = JSON.parse(raw); return u && (u.nama || u.name) ? (u.nama||u.name) : null; } catch(e){ return null; }
  }

  function setActiveLink(container){
    try{
      const links = container.querySelectorAll('.nav-link');
      const path = (window.location.pathname || '').toLowerCase();
      links.forEach(a=>{
        const href = a.getAttribute('href') || '';
        if (!href) return;
        // simple matching: compare last path segment or full href
        const normalized = href.replace(/^.*[\\/]/, '').toLowerCase();
        if (path.endsWith(normalized) || path.indexOf(href) !== -1) {
          a.classList.add('active');
        } else {
          a.classList.remove('active');
        }
      });
      // also check dropdown items and open parent dropdown if one of them is active
      const ddItems = container.querySelectorAll('.dropdown-menu .dropdown-item');
      ddItems.forEach(it => {
        const href = it.getAttribute('href') || '';
        const normalized = href.replace(/^.*[\\\/]/, '').toLowerCase();
        if (path.endsWith(normalized) || path.indexOf(href) !== -1) {
          it.classList.add('active');
          const menu = it.closest('.dropdown-menu');
          if (menu && menu.previousElementSibling && menu.previousElementSibling.classList.contains('dropdown-btn')) {
            menu.classList.add('show');
            menu.previousElementSibling.setAttribute('aria-expanded','true');
            menu.previousElementSibling.classList.add('active');
          }
        } else {
          it.classList.remove('active');
        }
      });
    }catch(e){}
  }

  function attachLogout(container){
    // support both the hidden role-menu logout and the visible quick logout
    const sel = ['#logout-btn', '#logout-btn-quick'];
    sel.forEach(id => {
      const btn = container.querySelector(id);
      if (!btn) return;
      btn.addEventListener('click', (e)=>{
        e.preventDefault();
        
        // Show confirmation modal
        if (typeof ConfirmModal !== 'undefined') {
          ConfirmModal.show({
            title: 'Konfirmasi Logout',
            message: 'Apakah Anda yakin ingin keluar dari sistem?',
            type: 'warning',
            confirmText: 'Ya, Keluar',
            cancelText: 'Batal',
            onConfirm: () => {
              try { localStorage.removeItem('currentUser'); } catch(_){ }
              const dest = new URL('../../index.html', window.location.href).toString();
              // attempt to call global handler (best-effort) then redirect
              try {
                if (typeof handleLogout === 'function') {
                  const res = handleLogout();
                  if (res && typeof res.then === 'function') {
                    res.then(()=> { window.location.href = dest; }).catch(()=> { window.location.href = dest; });
                    return;
                  }
                }
              } catch(err) { /* ignore and fallback to redirect */ }
              window.location.href = dest;
            }
          });
        } else {
          // Fallback to native confirm if ConfirmModal not loaded
          if (!confirm('Yakin ingin keluar?')) return;
          try { localStorage.removeItem('currentUser'); } catch(_){ }
          const dest = new URL('../../index.html', window.location.href).toString();
          window.location.href = dest;
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // if navbar is rendered as a mount point (component injection) the DOM will contain elements
    const root = document.querySelector('.navbar') || document.querySelector('.navbar-container');
    let container = root;
    if (!root) container = document;

    // set display name
    const nameEl = container.querySelector('#tatausaha-name');
    const name = getCurrentUserName();
    if (nameEl && name) nameEl.textContent = name;

    // set active link
    setActiveLink(container);

    // dropdown toggle behaviour (close others, aria handling)
    container.querySelectorAll('.dropdown-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = btn.nextElementSibling;
        if (!menu) return;
        // close other open menus
        container.querySelectorAll('.dropdown-menu.show').forEach(m => {
          if (m !== menu) {
            m.classList.remove('show');
            const otherBtn = m.previousElementSibling;
            if (otherBtn && otherBtn.classList.contains('dropdown-btn')) otherBtn.setAttribute('aria-expanded','false');
          }
        });
        const now = menu.classList.toggle('show');
        btn.setAttribute('aria-expanded', now ? 'true' : 'false');
      });
    });
    // click outside closes dropdowns
    document.addEventListener('click', () => {
      container.querySelectorAll('.dropdown-menu.show').forEach(m => {
        m.classList.remove('show');
        const btn = m.previousElementSibling;
        if (btn && btn.classList.contains('dropdown-btn')) btn.setAttribute('aria-expanded','false');
      });
      // close role-menu if open
      container.querySelectorAll('.role-menu.show').forEach(m => {
        m.classList.remove('show');
        const trigger = container.querySelector('#tata-role-trigger');
        if (trigger) trigger.setAttribute('aria-expanded','false');
        m.style.display = 'none';
      });
    });

    // Role trigger (show small menu with logout)
    const roleTrigger = container.querySelector('#tata-role-trigger');
    const roleMenu = container.querySelector('.role-menu');
    if (roleTrigger && roleMenu) {
      // toggle function
      function toggleRoleMenu(open) {
        const isOpen = !!roleMenu.classList.contains('show');
        const shouldOpen = typeof open === 'boolean' ? open : !isOpen;
        if (shouldOpen) {
          roleMenu.classList.add('show');
          roleMenu.style.display = 'block';
          roleTrigger.setAttribute('aria-expanded','true');
        } else {
          roleMenu.classList.remove('show');
          roleMenu.style.display = 'none';
          roleTrigger.setAttribute('aria-expanded','false');
        }
      }

      roleTrigger.addEventListener('click', (e)=>{
        e.stopPropagation();
        // close other dropdowns first
        container.querySelectorAll('.dropdown-menu.show').forEach(m => { m.classList.remove('show'); const b = m.previousElementSibling; if (b && b.classList.contains('dropdown-btn')) b.setAttribute('aria-expanded','false'); });
        toggleRoleMenu();
      });

      roleTrigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          toggleRoleMenu();
        }
        if (e.key === 'Escape') {
          toggleRoleMenu(false);
        }
      });
    }

    // attach logout handler
    attachLogout(container);
  });

})();
