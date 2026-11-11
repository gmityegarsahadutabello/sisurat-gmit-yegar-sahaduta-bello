// Koordinator navbar notifications (standalone — koordinator pages don't load navbar.js/Bootstrap)
// - Loads notifications for the koordinator role into the navbar bell
// - Manual dropdown open/close (no Bootstrap bundle on these pages)
// - Click notification to mark read; "Tandai semua dibaca" button
(function () {
	'use strict';

	var ROLE = 'koordinator';
	try {
		var u = JSON.parse(localStorage.getItem('currentUser') || '{}');
		if (u && u.role) ROLE = u.role;
	} catch (e) {}

	function escapeHtml(unsafe) {
		return String(unsafe)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	function formatTanggal(dateString) {
		if (!dateString) return '';
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "2-digit", month: "short", year: "numeric"
		});
	}

	function setBadge(count) {
		var countEl = document.getElementById('notif-count');
		if (!countEl) return;
		countEl.setAttribute('data-real', String(count));
		if (count === 0) {
			countEl.textContent = '';
			countEl.style.display = 'none';
		} else {
			countEl.textContent = count > 5 ? '5+' : String(count);
			countEl.style.display = 'inline-flex';
		}
	}

	function adjustNotifBadge(delta) {
		var countEl = document.getElementById('notif-count');
		if (!countEl) return;
		var current = parseInt(countEl.getAttribute('data-real') || '0', 10) || 0;
		setBadge(Math.max(0, current + delta));
	}

	function renderItems(data) {
		var notifUl = document.getElementById('notif-list');
		if (!notifUl) return;

		if (!data || data.length === 0) {
			notifUl.innerHTML = '<li><span class="dropdown-item" style="color:#6c757d;text-align:center;padding:1rem;">Belum ada notifikasi</span></li>';
			setBadge(0);
			return;
		}

		setBadge(data.filter(function (n) { return !n.read; }).length);

		notifUl.innerHTML = "";

		var unreadCount = data.filter(function (n) { return !n.read; }).length;

		// Header
		var headerLi = document.createElement("li");
		headerLi.innerHTML =
			'<div class="notif-header">' +
				'<div class="notif-header-title">' +
					'<i class="bi bi-bell-fill"></i> Notifikasi' +
					(unreadCount > 0 ? ' <span class="badge bg-primary" style="background:#0d6efd;color:#fff;border-radius:999px;font-size:0.7rem;padding:2px 7px;margin-left:6px;">' + unreadCount + '</span>' : '') +
				'</div>' +
			'</div>';
		notifUl.appendChild(headerLi);

		// "Tandai semua dibaca" action
		if (unreadCount > 0) {
			var markAllLi = document.createElement("li");
			var markAllBtn = document.createElement("button");
			markAllBtn.type = "button";
			markAllBtn.className = "dropdown-item";
			markAllBtn.style.cssText = "font-size:0.8rem;color:#0d6efd;font-weight:600;";
			markAllBtn.innerHTML = '<i class="bi bi-check2-all"></i> Tandai semua dibaca';
			markAllBtn.addEventListener('click', function (e) {
				e.preventDefault();
				e.stopPropagation();
				API.notifications.markAllAsRead({ role: ROLE }).then(function () {
					data.forEach(function (n) { n.read = true; });
					document.querySelectorAll('#notif-list .notif-unread').forEach(function (el) { el.classList.remove('notif-unread'); });
					document.querySelectorAll('#notif-list .notif-unread-dot').forEach(function (el) { el.remove(); });
					adjustNotifBadge(-unreadCount);
					var badgeInHeader = notifUl.querySelector('.notif-header .badge');
					if (badgeInHeader) badgeInHeader.remove();
					markAllLi.remove();
				}).catch(function (err) {
					console.error('Gagal menandai semua notifikasi dibaca:', err);
				});
			});
			markAllLi.appendChild(markAllBtn);
			notifUl.appendChild(markAllLi);
			var divider = document.createElement("li");
			divider.innerHTML = '<hr class="dropdown-divider" style="margin:0;">';
			notifUl.appendChild(divider);
		}

		// Items (newest first)
		data.sort(function (a, b) {
			return new Date(b.tanggal || b.createdAt || b.at || 0) - new Date(a.tanggal || a.createdAt || a.at || 0);
		}).slice(0, 10).forEach(function (n) {
			var li = document.createElement("li");
			var a = document.createElement("a");
			a.className = "dropdown-item notif-item";
			if (!n.read) a.classList.add('notif-unread');

			// Mark as read when clicked, then navigate
			// (await the read request briefly so navigation doesn't abort it)
			if (!n.read && n.id) {
				a.addEventListener('click', function (e) {
					// Let Ctrl/Cmd/Shift+click (open in new tab) behave normally
					if (e.ctrlKey || e.metaKey || e.shiftKey) return;
					e.preventDefault();
					a.classList.remove('notif-unread');
					var dot = a.querySelector('.notif-unread-dot');
					if (dot) dot.remove();
					n.read = true;
					adjustNotifBadge(-1);
					var go = function () {
						var hrefNow = a.getAttribute('href');
						if (hrefNow && hrefNow !== '#') window.location.href = hrefNow;
					};
					try {
						Promise.race([
							API.notifications.markAsRead(n.id),
							new Promise(function (res) { setTimeout(res, 1000); })
						]).then(go, go);
					} catch (err) { go(); }
				});
			}

			var href = n.url;
			if (!href && n.related_id) href = 'daftar-surat-masuk.html';
			if (!href) href = '#';
			a.href = href;

			var title = escapeHtml(n.title || n.judul || 'Notifikasi');
			var body = escapeHtml(n.message || n.pesan || '');
			var icon = 'bi-bell-fill', iconBg = '#f0f0f0', iconColor = '#6c757d';
			if (n.type === 'surat_dibuat') { icon = 'bi-file-earmark-plus-fill'; iconBg = '#cfe2ff'; iconColor = '#0a58ca'; }
			else if (n.type === 'surat_masuk') { icon = 'bi-check-circle-fill'; iconBg = '#d1e7dd'; iconColor = '#146c43'; }
			else if (n.type === 'surat_ditolak') { icon = 'bi-x-circle-fill'; iconBg = '#f8d7da'; iconColor = '#b02a37'; }

			a.innerHTML =
				'<div class="notif-content">' +
					'<div class="notif-icon-wrapper" style="background-color:' + iconBg + ';">' +
						'<i class="' + icon + '" style="color:' + iconColor + ';"></i>' +
					'</div>' +
					'<div class="notif-text">' +
						'<div class="notif-title">' + title + '</div>' +
						'<div class="notif-message">' + body + '</div>' +
						'<div class="notif-time"><i class="bi bi-clock"></i> <span>' + formatTanggal(n.at || n.tanggal) + '</span></div>' +
					'</div>' +
					(!n.read ? '<div class="notif-unread-dot"></div>' : '') +
				'</div>';

			if (href === '#') {
				a.addEventListener('click', function (e) { e.preventDefault(); });
			}
			li.appendChild(a);
			notifUl.appendChild(li);
		});
	}

	function loadNotifikasi() {
		var notifUl = document.getElementById('notif-list');
		if (!notifUl) return;
		API.notifications.getAll({ role: ROLE }).then(function (data) {
			renderItems(data || []);
		}).catch(function (err) {
			console.error('Gagal memuat notifikasi:', err);
			notifUl.innerHTML = '<li><span class="dropdown-item" style="color:#b02a37;text-align:center;padding:1rem;">Gagal memuat notifikasi</span></li>';
		});
	}

	// Manual dropdown open/close (no Bootstrap bundle on koordinator pages)
	function initDropdown() {
		var btn = document.getElementById('notifButton');
		var list = document.getElementById('notif-list');
		if (!btn || !list) return;

		btn.addEventListener('click', function (e) {
			e.preventDefault();
			e.stopPropagation();
			var isOpen = list.classList.toggle('show');
			btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
			if (isOpen) loadNotifikasi(); // refresh every time it opens
		});

		document.addEventListener('click', function (e) {
			if (!list.classList.contains('show')) return;
			if (list.contains(e.target) || btn.contains(e.target)) return;
			list.classList.remove('show');
			btn.setAttribute('aria-expanded', 'false');
		});
	}

	function boot() {
		initDropdown();
		// initial load (list markup is inline on koordinator pages, so it's already in the DOM)
		loadNotifikasi();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
