// Navbar dropdown behaviour shared by koordinator pages
document.addEventListener('DOMContentLoaded', () => {
  // Desktop dropdown
  document.querySelectorAll('.dropdown-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = btn.nextElementSibling;
      if (!menu) return;
      // close others
      document.querySelectorAll('.dropdown-menu.show').forEach(m => {
        if (m !== menu) {
          m.classList.remove('show');
          const ob = m.previousElementSibling;
          if (ob && ob.classList.contains('dropdown-btn')) ob.setAttribute('aria-expanded','false');
        }
      });
      const now = menu.classList.toggle('show');
      btn.setAttribute('aria-expanded', now ? 'true' : 'false');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.show').forEach(m => {
      m.classList.remove('show');
      const b = m.previousElementSibling;
      if (b && b.classList.contains('dropdown-btn')) b.setAttribute('aria-expanded','false');
    });
  });

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = mobileMenu.classList.toggle('active');
      const icon = mobileToggle.querySelector('i');
      if (icon) {
        icon.className = isOpen ? 'bi bi-x-lg' : 'bi bi-list';
      }
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
        mobileMenu.classList.remove('active');
        const icon = mobileToggle.querySelector('i');
        if (icon) icon.className = 'bi bi-list';
        document.body.style.overflow = '';
      }
    });

    // Close mobile menu when clicking a link
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        const icon = mobileToggle.querySelector('i');
        if (icon) icon.className = 'bi bi-list';
        document.body.style.overflow = '';
      });
    });
  }

  // set rayon label and name
  (function setRayonLabel(){
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const rayon = currentUser.rayon || sessionStorage.getItem('rayon') || 'Rayon 1';
      const nama = currentUser.nama || 'Koordinator';
      
      const elRayon = document.getElementById('coordinator-rayon');
      // Format display as 'Koordinator Rayon X' for better clarity
      if (elRayon) {
        const displayText = rayon.toLowerCase().includes('koordinator') ? rayon : `Koordinator ${rayon}`;
        elRayon.textContent = displayText;
      }
      
      const elNama = document.getElementById('coordinator-name');
      if (elNama) elNama.textContent = nama;

      // Sync mobile menu user info
      const mobileNama = document.getElementById('mobile-coordinator-name');
      const mobileRayon = document.getElementById('mobile-coordinator-rayon-mobile');
      if (mobileNama) mobileNama.textContent = nama;
      if (mobileRayon) {
        const displayText = rayon.toLowerCase().includes('koordinator') ? rayon : `Koordinator ${rayon}`;
        mobileRayon.textContent = displayText;
      }
    } catch(e) {
      console.error('Error setting rayon/name:', e);
    }
  })();

  // Attach logout handler with ConfirmModal
  const logoutBtn = document.getElementById('logout-btn');
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
  
  [logoutBtn, mobileLogoutBtn].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Show confirmation modal if available
      if (typeof ConfirmModal !== 'undefined') {
        ConfirmModal.show({
          title: 'Konfirmasi Logout',
          message: 'Apakah Anda yakin ingin keluar dari sistem?',
          type: 'warning',
          confirmText: 'Ya, Keluar',
          cancelText: 'Batal',
          onConfirm: () => {
            try {
              localStorage.removeItem('currentUser');
              localStorage.removeItem('token');
              sessionStorage.clear();
            } catch(e) {}
            window.location.href = '../../index.html';
          }
        });
      } else {
        // Fallback to native confirm
        if (!confirm('Yakin ingin keluar?')) return;
        try {
          localStorage.removeItem('currentUser');
          localStorage.removeItem('token');
          sessionStorage.clear();
        } catch(e) {}
        window.location.href = '../../index.html';
      }
    });
  });
});