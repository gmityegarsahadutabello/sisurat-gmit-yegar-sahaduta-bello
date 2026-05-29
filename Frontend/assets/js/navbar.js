// Initialize: load notifications when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    // Tunggu sebentar untuk memastikan semua script loaded
    setTimeout(() => {
        // Preload confirmation modal script if not present
        try {
            if (typeof ConfirmModal === 'undefined') {
                const existing = document.querySelector('script[data-autoload="confirmation-modal"]');
                if (!existing) {
                    const s = document.createElement('script');
                    // Dynamic path based on current location
                    const currentPath = window.location.pathname;
                    let modalPath = 'assets/js/confirmation-modal.js';
                    
                    // If in subdirectory (pages/admin, pages/tatausaha, etc)
                    if (currentPath.includes('/pages/')) {
                        modalPath = '../../assets/js/confirmation-modal.js';
                    }
                    
                    s.src = modalPath;
                    s.setAttribute('data-autoload','confirmation-modal');
                    document.head.appendChild(s);
                }
            }
        } catch(e) {
            console.error('Error loading confirmation modal:', e);
        }
        loadNotifikasi();
        loadProfile();
    }, 100);
    
    // wire logout button if present (in case logout added after injection)
    document.addEventListener('click', (e) => {
        const btn = e.target && (e.target.id === 'logout-btn' ? e.target : (e.target.closest ? e.target.closest('#logout-btn') : null));
        if (btn) {
            e.preventDefault();
            handleLogout();
        }
    });
    // When the profile trigger is clicked, replace the profile menu content
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest && e.target.closest('#profileDropdown');
        if (!trigger) return;
        try {
            // find menu by aria-labelledby or by id
            const menu = document.querySelector('#profile-menu') || document.querySelector('[aria-labelledby="profileDropdown"]');
            if (!menu) return;
            // replace content so only logout button remains
            menu.innerHTML = `<li><button id="logout-btn" class="dropdown-item text-danger" type="button"><i class="bi bi-box-arrow-right me-2"></i>Keluar</button></li>`;
        } catch (err) {
            console.warn('Gagal mengubah menu profil:', err);
        }
    });
});


// --- Load Notifikasi dari API ---
async function loadNotifikasi() {
    try {
        const notifUl = document.getElementById("notif-list");
        if (!notifUl) { return; }

        let data = null;
        
        // Cek role user terlebih dahulu
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const userNik = currentUser.nik;
        const role = currentUser.role;
        
        console.log('Loading notifikasi untuk role:', role, 'NIK:', userNik);
        
        // Untuk jemaat: load dari API dengan parameter NIK
        if (role === 'jemaat' && userNik) {
            try {
                console.log('🔔 Loading notifications for jemaat NIK:', userNik);
                
                // Call API with nik parameter
                const response = await API.notifications.getAll({ nik: userNik });
                data = response || [];
                
                console.log('🔔 Total notifikasi dari API:', data.length);
                
                // Sort by date descending (use tanggal, createdAt, or at)
                data.sort((a, b) => {
                    const dateA = new Date(a.tanggal || a.createdAt || a.at || 0);
                    const dateB = new Date(b.tanggal || b.createdAt || b.at || 0);
                    return dateB - dateA;
                });
                
                // Limit to latest 10
                data = data.slice(0, 10);
                
                console.log('🔔 Notifikasi setelah filter:', data.length);
            } catch (err) {
                console.error('Error loading notifications:', err);
                data = [];
            }
        } else {
            // Role lain: coba dari API
            notifUl.innerHTML = `<li><span class="dropdown-item text-muted">Memuat...</span></li>`;
            if (typeof apiGet === 'function') {
                try { data = await apiGet('/notifikasi'); } catch (e) { 
                    console.log('API call failed:', e);
                    data = null; 
                }
            } else {
                try {
                    const res = await fetch('/notifikasi', { credentials: 'include' });
                    if (res.ok) data = await res.json();
                } catch (e) { 
                    console.log('Fetch failed:', e);
                    data = null; 
                }
            }
        }
        
        if (!data || data.length === 0) {
            notifUl.innerHTML = `
                <li>
                    <div class=\"dropdown-item text-center py-5\" style=\"border: none;\">
                        <div style=\"opacity: 0.3; margin-bottom: 12px;\">
                            <i class=\"bi bi-bell-slash\" style=\"font-size: 3rem; color: #6c757d;\"></i>
                        </div>
                        <div style=\"font-size: 0.95rem; font-weight: 600; color: #495057; margin-bottom: 6px;\">
                            Belum Ada Notifikasi
                        </div>
                        <div style=\"font-size: 0.8rem; color: #6c757d; line-height: 1.5;\">
                            Anda akan menerima pemberitahuan<br>terkait status pengajuan surat di sini
                        </div>
                    </div>
                </li>
            `;
            // hide badge
            const countEl0 = document.getElementById('notif-count');
            if (countEl0) countEl0.style.display = 'none';
            return;
        }

        // show count badge with small pop animation
        const countEl = document.getElementById('notif-count');
        if (countEl) {
            const prev = parseInt(countEl.getAttribute('data-real') || '0', 10) || 0;
            const realCount = data.length || 0;
            const displayText = realCount > 5 ? '5+' : String(realCount);
            countEl.textContent = displayText;
            countEl.style.display = 'inline-flex';
            countEl.setAttribute('data-real', String(realCount));
            // animation when changed
            if (realCount !== prev) {
                countEl.classList.remove('badge-pop');
                void countEl.offsetWidth;
                countEl.classList.add('badge-pop');
                countEl.addEventListener('animationend', function handler() {
                    countEl.classList.remove('badge-pop');
                    countEl.removeEventListener('animationend', handler);
                });
            }
        }

        notifUl.innerHTML = "";
        
        // Add header with count and "Mark all as read" option
        const unreadCount = data.filter(n => !n.read).length;
        if (data.length > 0) {
            const headerLi = document.createElement("li");
            headerLi.innerHTML = `
                <div class="notif-header">
                    <div class="notif-header-title">
                        <i class="bi bi-bell-fill me-2"></i>Notifikasi
                        ${unreadCount > 0 ? `<span class="badge bg-primary ms-2">${unreadCount}</span>` : ''}
                    </div>
                </div>
            `;
            notifUl.appendChild(headerLi);
            
            // Add divider
            const dividerLi = document.createElement("li");
            dividerLi.innerHTML = '<hr class="dropdown-divider my-0">';
            notifUl.appendChild(dividerLi);
        }

        data.forEach(n => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.className = "dropdown-item notif-item";
            
            // Add unread class if notification is unread
            if (!n.read) {
                a.classList.add('notif-unread');
            }
            
            // use provided id/url if available, otherwise link to detail page with id param
            let href = n.url;
            if (!href && n.related_id) {
                // Fallback: jika tidak ada URL tapi ada related_id, arahkan ke detail pengajuan
                // Prioritas untuk role Jemaat (file di root)
                if (n.to_role === 'jemaat' || !n.to_role) {
                    href = `pengajuan-detail.html?id=${encodeURIComponent(n.related_id)}`;
                }
            }
            if (!href) {
                href = n.id ? `notifikasi.html?id=${encodeURIComponent(n.id)}` : '#';
            }
            a.href = href;
            const title = escapeHtml(n.title || n.judul || 'Notifikasi');
            const body = escapeHtml(n.message || n.pesan || '');
            
            // Icon berdasarkan tipe notifikasi
            let icon = 'bi-bell-fill';
            let iconBg = '#f0f0f0';
            let iconColor = '#6c757d';
            if (n.type === 'surat_dibuat') {
                icon = 'bi-file-earmark-plus-fill';
                iconBg = '#cfe2ff';
                iconColor = '#0a58ca';
            } else if (n.type === 'surat_masuk') {
                icon = 'bi-check-circle-fill';
                iconBg = '#d1e7dd';
                iconColor = '#146c43';
            } else if (n.type === 'surat_ditolak') {
                icon = 'bi-x-circle-fill';
                iconBg = '#f8d7da';
                iconColor = '#b02a37';
            }
            
            a.innerHTML = `
                <div class="notif-content">
                    <div class="notif-icon-wrapper" style="background-color:${iconBg};">
                        <i class="${icon}" style="color:${iconColor};"></i>
                    </div>
                    <div class="notif-text">
                        <div class="notif-title">${title}</div>
                        <div class="notif-message">${body}</div>
                        <div class="notif-time">
                            <i class="bi bi-clock"></i>
                            <span>${formatTanggal(n.at || n.tanggal)}</span>
                        </div>
                    </div>
                    ${!n.read ? '<div class="notif-unread-dot"></div>' : ''}
                </div>
            `;
            
            // if href is '#', prevent jump and just close dropdown on click
            if (href === '#') {
                a.addEventListener('click', (e) => e.preventDefault());
            }
            li.appendChild(a);
            notifUl.appendChild(li);
        });

    } catch (err) {
        console.error("Gagal memuat notifikasi:", err);
        const notifUl = document.getElementById("notif-list");
        if (notifUl) notifUl.innerHTML = `<li><span class="dropdown-item text-muted">Gagal memuat notifikasi</span></li>`;
    }
}


// --- Util Format Tanggal ---
function formatTanggal(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

// Minimal HTML escaper for notification text
function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// --- Load profile (name, role, avatar) ---
async function loadProfile() {
    try {
        const nameEl = document.getElementById('profile-name');
        const roleEl = document.getElementById('profile-role');
        const imgEl = document.getElementById('profile-img');
        
        // Also update mobile dropdown elements
        const nameMobileEl = document.getElementById('profile-name-mobile');
        const roleMobileEl = document.getElementById('profile-role-mobile');
        
        if (!nameEl && !roleEl && !imgEl) return;

        // Get user directly from localStorage (no need for API call)
        let user = null;
        try {
            const raw = localStorage.getItem('currentUser');
            user = raw ? JSON.parse(raw) : null;
        } catch (err) {
            user = null;
        }

        if (user) {
            const userName = user.nama || user.name || 'Nama';
            const userRole = getRoleLabel(user);
            
            // Update desktop profile
            if (nameEl) nameEl.textContent = userName;
            if (roleEl) roleEl.textContent = userRole;
            
            // Update mobile dropdown profile
            if (nameMobileEl) nameMobileEl.textContent = userName;
            if (roleMobileEl) roleMobileEl.textContent = userRole;
            
            if (imgEl) {
                // use user.avatar, foto, photo, or fallback to existing src
                const src = user.avatar || user.foto || user.photo || imgEl.src;
                imgEl.src = src || imgEl.src;
            }
        }
    } catch (err) {
        console.warn('Gagal memuat profil:', err);
    }
}

// --- Logout handler ---
async function handleLogout() {
    // Ensure confirmation modal is available and loaded
    await ensureConfirmModal();

    // Show confirmation modal if available
    if (typeof ConfirmModal !== 'undefined') {
        try {
            ConfirmModal.show({
                title: 'Konfirmasi Logout',
                message: 'Apakah Anda yakin ingin keluar dari sistem?',
                type: 'warning',
                confirmText: 'Ya, Keluar',
                cancelText: 'Batal',
                onConfirm: async () => {
                    try {
                        // Prefer frontend session helper if available
                        if (window.LS && typeof window.LS.logout === 'function') {
                            window.LS.logout();
                            return;
                        }
                        // attempt to call logout endpoint; backend may accept POST or GET
                        let ok = false;
                        try {
                            const res = await fetch('/logout', { method: 'POST', credentials: 'include' });
                            ok = res.ok;
                        } catch (e) { /* ignore */ }

                        if (!ok) {
                            try {
                                const res2 = await fetch('/logout', { method: 'GET', credentials: 'include' });
                                ok = res2.ok;
                            } catch (e) { /* ignore */ }
                        }

                        // clear local currentUser as well
                        try { localStorage.removeItem('currentUser'); } catch(e) {}
                        try { localStorage.removeItem('token'); } catch(e) {}

                            const isLiveServer = /localhost:5500|127\.0\.0\.1:5500/i.test(window.location.origin);
                            window.location.href = isLiveServer ? '/Frontend/index.html' : 'index.html';
                    } catch (err) {
                        console.error('Logout failed:', err);
                        try { localStorage.removeItem('currentUser'); } catch (e) {}
                        try { localStorage.removeItem('token'); } catch (e) {}
                        window.location.href = 'index.html';
                    }
                }
            });
        } catch (e) {
            console.warn('ConfirmModal.show gagal, gunakan confirm native:', e);
            if (!confirm('Yakin ingin keluar?')) return;
            try {
                if (window.LS && typeof window.LS.logout === 'function') {
                    window.LS.logout();
                    return;
                }
                let ok = false;
                try { const res = await fetch('/logout', { method: 'POST', credentials: 'include' }); ok = res.ok; } catch(_){}
                if (!ok) { try { const r2 = await fetch('/logout', { method: 'GET', credentials: 'include' }); ok = r2.ok; } catch(_){} }
                try { localStorage.removeItem('currentUser'); } catch(_){}
                try { localStorage.removeItem('token'); } catch(_){}
                    const isLiveServer = /localhost:5500|127\.0\.0\.1:5500/i.test(window.location.origin);
                    window.location.href = isLiveServer ? '/Frontend/index.html' : 'index.html';
            } catch(err){
                console.error('Logout (fallback) failed:', err);
                try { localStorage.removeItem('currentUser'); } catch(_){}
                try { localStorage.removeItem('token'); } catch(_){}
                window.location.href = 'index.html';
            }
        }
    } else {
        // Fallback to native confirm if ConfirmModal not loaded
        if (!confirm('Yakin ingin keluar?')) return;
        try {
            if (window.LS && typeof window.LS.logout === 'function') {
                window.LS.logout();
                return;
            }
            // attempt to call logout endpoint; backend may accept POST or GET
            let ok = false;
            try {
                const res = await fetch('/logout', { method: 'POST', credentials: 'include' });
                ok = res.ok;
            } catch (e) { /* ignore */ }

            if (!ok) {
                try {
                    const res2 = await fetch('/logout', { method: 'GET', credentials: 'include' });
                    ok = res2.ok;
                } catch (e) { /* ignore */ }
            }

            // clear local currentUser as well
            try { localStorage.removeItem('currentUser'); } catch(e) {}
            try { localStorage.removeItem('token'); } catch(e) {}

                const isLiveServer = /localhost:5500|127\.0\.0\.1:5500/i.test(window.location.origin);
                window.location.href = isLiveServer ? '/Frontend/index.html' : 'index.html';
        } catch (err) {
            console.error('Logout failed:', err);
            try { localStorage.removeItem('currentUser'); } catch (e) {}
            try { localStorage.removeItem('token'); } catch (e) {}
            window.location.href = 'index.html';
        }
    }
}

// Utility: ensure confirmation modal script is loaded before use
function ensureConfirmModal(timeout = 2000) {
    return new Promise((resolve) => {
        if (typeof ConfirmModal !== 'undefined') return resolve();
        // try to inject if missing
        let tag = document.querySelector('script[data-autoload="confirmation-modal"]');
        if (!tag) {
            tag = document.createElement('script');
            tag.src = 'assets/js/confirmation-modal.js';
            tag.setAttribute('data-autoload','confirmation-modal');
            document.head.appendChild(tag);
        }
        const start = Date.now();
        const check = () => {
            if (typeof ConfirmModal !== 'undefined') return resolve();
            if (Date.now() - start > timeout) {
                // define a minimal shim so callers can continue
                if (typeof ConfirmModal === 'undefined') {
                    window.ConfirmModal = {
                        show: ({ message = 'Konfirmasi diperlukan', onConfirm } = {}) => {
                            if (window.confirm(message)) {
                                try { onConfirm && onConfirm(); } catch(_){}
                            }
                        },
                        hide: () => {},
                        setLoading: () => {}
                    };
                }
                return resolve();
            }
            setTimeout(check, 50);
        };
        check();
    });
}

/*
  Navbar profile loader
  - Tampilkan nama lengkap akun (nama_lengkap / fullName / nama / name)
  - Tunggu elemen navbar yang di-inject (fetch) sebelum men-set teks
  - Auto-update saat localStorage 'currentUser' berubah (storage event + polling fallback)
*/
(function(){
  // small util: wait for an element to appear in DOM
  function waitFor(selector, timeout = 3000) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const obs = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) {
          obs.disconnect();
          resolve(found);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { try{ obs.disconnect(); }catch(e){}; resolve(document.querySelector(selector)); }, timeout);
    });
  }

  // Get user directly from localStorage (no need for API call)
  async function resolveCurrentUser() {
    let user = null;
    try {
      const raw = localStorage.getItem('currentUser');
      user = raw ? JSON.parse(raw) : null;
    } catch(e) { 
      user = null; 
    }
    return user;
  }

  // update UI: support variations of navbar markup across pages
  async function updateProfileUI() {
    try {
      // wait for navbar/profile to exist (handles injected component)
      await waitFor('.navbar, nav.navbar, #profile-name, .profile-name', 1500);

      // find possible name elements
      const nameEl = document.querySelector('#profile-name') || document.querySelector('.profile-name') || document.querySelector('[data-profile-name]');
      const roleEl = document.querySelector('#profile-role') || document.querySelector('.profile-role') || document.querySelector('[data-profile-role]');
      const imgEl  = document.querySelector('#profile-img')  || document.querySelector('.profile-avatar') || document.querySelector('[data-profile-img]');
      
      // Mobile dropdown elements
      const nameMobileEl = document.querySelector('#profile-name-mobile');
      const roleMobileEl = document.querySelector('#profile-role-mobile');

      if (!nameEl && !roleEl && !imgEl) return;

      const user = await resolveCurrentUser();
      if (!user) return;

      // prefer full-name fields
      const nameCandidates = [
        user.nama_lengkap, user.namaLengkap, user.fullName, user.fullname,
        user.nama, user.name, user.displayName, user.nama_lengkap
      ];
      const profileName = nameCandidates.find(v => v && String(v).trim()) || 'Nama Jemaat';
      const profileRole = getRoleLabel(user);
      
      // Update desktop profile
      if (nameEl) nameEl.textContent = profileName;
      if (roleEl) roleEl.textContent = profileRole;
      
      // Update mobile profile
      if (nameMobileEl) nameMobileEl.textContent = profileName;
      if (roleMobileEl) roleMobileEl.textContent = profileRole;

      if (imgEl) {
        const src = user.avatar || user.foto || user.photo || user.image || imgEl.getAttribute('src') || '';
        if (src) imgEl.src = src;
      }
    } catch (err) {
      console.warn('updateProfileUI error:', err);
    }
  }

  // initialize on DOM ready
  function ready(fn){
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(fn,10);
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(() => {
    // initial
    updateProfileUI();

    // other tabs: storage event
    window.addEventListener('storage', (e) => {
      if (!e.key || e.key === 'currentUser' || e.key === 'users' || e.key === 'rayon') updateProfileUI();
    });

    // same-tab fallback polling when code writes localStorage without triggering storage
    let last = localStorage.getItem('currentUser');
    setInterval(() => {
      const cur = localStorage.getItem('currentUser');
      if (cur !== last) {
        last = cur;
        updateProfileUI();
      }
    }, 1200);

    // also observe navbar DOM insertions (if navbar HTML injected later)
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) {
          // if a navbar or profile node added, try update
          for (const n of m.addedNodes) {
            if (n.nodeType === 1 && (n.matches && (n.matches('.navbar') || n.querySelector && (n.querySelector('#profile-name') || n.querySelector('.profile-name'))))) {
              updateProfileUI();
              return;
            }
          }
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  });

  // expose for debugging
  window.updateNavbarProfile = updateProfileUI;
})();

// Determine role label from user or URL context
function getRoleLabel(user){
  try {
    const role = (user && (user.role || user.jabatan || user.roleLabel)) || '';
    const norm = String(role).toLowerCase();
    if (norm.includes('admin')) return 'Administrator';
    if (norm.includes('koordinator')) return 'Koordinator Rayon';
    if (norm.includes('tata')) return 'Tata Usaha';
    if (norm.includes('sekretaris')) return 'Sekretaris';
    if (norm.includes('pendeta')) return 'Pendeta';
    if (norm.includes('jemaat')) return 'Jemaat';
    // infer from URL path as fallback
    const p = (window.location.pathname || '').toLowerCase();
    if (p.includes('/admin/')) return 'Administrator';
    if (p.includes('/koordinator/')) return 'Koordinator Rayon';
    if (p.includes('/tatausaha/')) return 'Tata Usaha';
    if (p.includes('/sekretaris/')) return 'Sekretaris';
    if (p.includes('/pendeta/')) return 'Pendeta';
    return 'Jemaat';
  } catch(e){ return 'Jemaat'; }
}
