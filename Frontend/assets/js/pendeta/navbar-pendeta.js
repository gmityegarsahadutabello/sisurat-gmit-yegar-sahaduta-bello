// Pendeta role navbar injector & behaviour
// - injects `assets/components/navbar-pendeta.html` into pages
// - sets active link and binds logout/role menu behavior
(function(){
	// inject navbar component
	fetch('../../assets/components/navbar-pendeta.html')
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
			return u.nama || u.name || 'Pendeta';
		} catch(e){ return 'Pendeta'; }
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
				if (href.includes('dashboard-pendeta') && path.includes('dashboard-pendeta')) link.classList.add('active');
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
		const nameEl = container.querySelector('#pendeta-name');
		if (nameEl) nameEl.textContent = getCurrentUserName();

		setActiveLink(container);
		attachLogout(container);

		// Hamburger menu toggle
		const toggler = container.querySelector('.navbar-toggler');
		const navCenter = container.querySelector('.nav-center');
		const overlay = container.querySelector('.menu-overlay');
		
		if (toggler && navCenter) {
			toggler.addEventListener('click', (e) => {
				e.stopPropagation();
				toggler.classList.toggle('active');
				navCenter.classList.toggle('show');
				if (overlay) overlay.classList.toggle('show');
				document.body.classList.toggle('menu-open');
				
				const isExpanded = navCenter.classList.contains('show');
				toggler.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
			});

			// Close menu when clicking outside
			if (overlay) {
				overlay.addEventListener('click', () => {
					toggler.classList.remove('active');
					navCenter.classList.remove('show');
					overlay.classList.remove('show');
					document.body.classList.remove('menu-open');
					toggler.setAttribute('aria-expanded', 'false');
				});
			}

			// Close menu when clicking nav links
			const navLinks = navCenter.querySelectorAll('.nav-link');
			navLinks.forEach(link => {
				link.addEventListener('click', () => {
					toggler.classList.remove('active');
					navCenter.classList.remove('show');
					if (overlay) overlay.classList.remove('show');
					document.body.classList.remove('menu-open');
					toggler.setAttribute('aria-expanded', 'false');
				});
			});
		}

		// toggle role menu
		const trigger = container.querySelector('#pen-role-trigger');
		const menu = container.querySelector('.role-menu');
		if (trigger && menu){
			trigger.addEventListener('click', (e) => {
				e.stopPropagation();
				menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
				trigger.setAttribute('aria-expanded', menu.style.display === 'block' ? 'true' : 'false');
			});
			document.addEventListener('click', ()=>{ menu.style.display = 'none'; trigger.setAttribute('aria-expanded','false'); });
			menu.addEventListener('click', e => e.stopPropagation());
		}
	}

	document.addEventListener('DOMContentLoaded', initializeNavbar);
})();
