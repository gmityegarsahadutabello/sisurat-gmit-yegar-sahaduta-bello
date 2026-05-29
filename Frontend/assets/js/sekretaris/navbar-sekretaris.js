// Sekretaris role navbar injector & behaviour
// - injects `assets/components/navbar-sekretaris.html` into pages
// - sets active link and binds logout/role menu behavior
(function(){
	// inject navbar component
	fetch('../../assets/components/navbar-sekretaris.html')
		.then(res => res.text())
		.then(html => {
			const el = document.querySelector('.navbar') || document.querySelector('.navbar-container');
			if (el) {
				el.innerHTML = html;
				// Initialize navbar after injection
				initializeNavbar();
			}
		})
		.catch(() => {});

	function getCurrentUserName(){
		try {
			const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
			return u.nama || u.name || 'Sekretaris';
		} catch(e){ return 'Sekretaris'; }
	}

	function setActiveLink(container){
		try{
			const path = window.location.pathname;
			const links = container.querySelectorAll('.nav-link');
			links.forEach(link => {
				const href = link.getAttribute('href') || '';
				link.classList.remove('active');
				// mark active if current path contains the href filename
				if (href && path.includes(href)) link.classList.add('active');
				// exact match for dashboard
				if (href.includes('dashboard-sekretaris') && path.includes('dashboard-sekretaris')) link.classList.add('active');
			});
		} catch(e){}
	}

	function attachLogout(container){
		const sel = ['#logout-btn', '#logout-btn-quick', '#logout-btn-mobile'];
		sel.forEach(id => {
			const btn = container.querySelector(id);
			if (!btn) return;
			btn.addEventListener('click', (e) => {
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
							localStorage.removeItem('currentUser');
							localStorage.removeItem('token');
							window.location.href = '../../index.html';
						}
					});
				} else {
					// Fallback to native confirm if ConfirmModal not loaded
					if (!confirm('Yakin ingin keluar?')) return;
					localStorage.removeItem('currentUser');
					localStorage.removeItem('token');
					window.location.href = '../../index.html';
				}
			});
		});
	}

	function initializeNavbar() {
		const root = document.querySelector('.navbar') || document.querySelector('.navbar-container');
		if (!root) return;

		const container = root;
		// set display name
		const nameEl = container.querySelector('#sekretaris-name');
		if (nameEl) nameEl.textContent = getCurrentUserName();

		setActiveLink(container);
		attachLogout(container);

		// Hamburger menu toggle
		const toggleBtn = container.querySelector('#navToggleSekretaris');
		const navMenu = container.querySelector('#navMenuSekretaris');
		const navActions = container.querySelector('.nav-actions');
		
		if (toggleBtn && navMenu) {
			toggleBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				navMenu.classList.toggle('show');
				if (navActions) navActions.classList.toggle('show');
			});

			// Close on outside click
			document.addEventListener('click', (e) => {
				if (!container.contains(e.target)) {
					navMenu.classList.remove('show');
					if (navActions) navActions.classList.remove('show');
				}
			});

			// Close on link click
			navMenu.querySelectorAll('.nav-link').forEach(link => {
				link.addEventListener('click', () => {
					navMenu.classList.remove('show');
					if (navActions) navActions.classList.remove('show');
				});
			});
		}
	}

	document.addEventListener('DOMContentLoaded', initializeNavbar);
})();
