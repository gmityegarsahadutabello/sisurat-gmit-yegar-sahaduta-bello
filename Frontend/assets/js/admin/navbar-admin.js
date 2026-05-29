// Admin role navbar injector & behaviour - Responsive Version
(function(){
	// Global logout function that can be called from modal
	window.performAdminLogout = function() {
		console.log('🚪 Logging out admin...');
		
		// Clear all session data
		localStorage.removeItem('currentUser');
		localStorage.removeItem('token');
		sessionStorage.clear();
		
		console.log('✅ Session data cleared');
		
		// Redirect to login page (from pages/admin/ to root)
		console.log('🔄 Redirecting to login page...');
		setTimeout(() => {
			window.location.href = '../../index.html';
		}, 100);
	};

	// inject navbar component
	fetch('../../assets/components/navbar-admin.html')
		.then(res => res.text())
		.then(html => {
			const el = document.querySelector('#navbar-container') || document.querySelector('.navbar') || document.querySelector('.navbar-container');
			if (el) {
				el.innerHTML = html;
				// initialize newly injected markup
				try { initAdminNavbar(el); } catch(e) { console.error('Navbar init error:', e); }
			}
		})
		.catch(() => {});

	function getCurrentUserName(){
		try {
			const raw = localStorage.getItem('currentUser');
			if (!raw) return 'Administrator';
			const u = JSON.parse(raw);
			return (u && (u.nama || u.name)) ? (u.nama || u.name) : 'Administrator';
		} catch(e){ return 'Administrator'; }
	}

	function setActiveLink(container){
		try{
			const path = window.location.pathname;
			const links = container.querySelectorAll('.nav-link');
			links.forEach(link => {
				const href = link.getAttribute('href') || '';
				link.classList.remove('active');
				
				// Check if current page matches the link
				if (href && path.includes(href)) {
					link.classList.add('active');
				}
				// Specific checks for each page
				if (href.includes('dashboard-admin') && (path.includes('dashboard-admin') || path.endsWith('/admin/') || path.endsWith('/admin'))) {
					link.classList.add('active');
				}
				if (href.includes('accounts.html') && path.includes('accounts.html')) {
					link.classList.add('active');
				}
				if (href.includes('kelola-arsip.html') && path.includes('kelola-arsip.html')) {
					link.classList.add('active');
				}
			});
		} catch(e){ console.error('Active link error:', e); }
	}

	function attachLogout(container){
		const sel = ['#logout-btn', '#logout-btn-quick'];
		sel.forEach(id => {
			const btn = container.querySelector(id);
			if (!btn) return;
			btn.addEventListener('click', (e) => {
				e.preventDefault();
				
				// Trigger logout modal if available
				const logoutModalElement = document.getElementById('logoutConfirmModal');
				if (logoutModalElement) {
					logoutModalElement.classList.add('show');
					document.body.style.overflow = 'hidden';
					return;
				}
				
				// Fallback to confirm dialog if modal not available
				if (!confirm('Yakin ingin keluar?')) return;
				
				// Use global logout function
				window.performAdminLogout();
			});
		});
	}

	function autoCollapseOnMobile(container) {
		// Auto-collapse navbar when clicking a nav link on mobile
		const navbarCollapse = container.querySelector('.navbar-collapse');
		const navLinks = container.querySelectorAll('.nav-link');
		
		if (navbarCollapse && navLinks.length > 0) {
			navLinks.forEach(link => {
				link.addEventListener('click', () => {
					// Check if we're on mobile (navbar is collapsed)
					if (window.innerWidth < 992) {
						const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
						if (bsCollapse) {
							bsCollapse.hide();
						}
					}
				});
			});
		}
	}

	// Initialize admin navbar controls when the navbar markup is present
	function initAdminNavbar(container){
		try {
			const nameEl = container.querySelector('#admin-name');
			if (nameEl) nameEl.textContent = getCurrentUserName();

			setActiveLink(container);
			attachLogout(container);
			autoCollapseOnMobile(container);

			console.log('✅ Admin navbar initialized');
		} catch(e) { 
			console.error('❌ Navbar init error:', e); 
		}
	}

	document.addEventListener('DOMContentLoaded', ()=>{
		const root = document.querySelector('#navbar-container') || document.querySelector('.navbar') || document.querySelector('.navbar-container');
		if (!root) return;
		// initialize after a short delay so injected HTML is ready
		setTimeout(() => initAdminNavbar(root), 50);
	});
})();
