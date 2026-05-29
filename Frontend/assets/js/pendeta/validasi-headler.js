// Pendeta - Validation Handler
// Adds realtime timeline entries and updates local_pengajuan flags
(function(){
	function now(){ return new Date().toISOString(); }
	function saveAll(all){ localStorage.setItem('local_pengajuan', JSON.stringify(all)); }
	function loadAll(){ try { return JSON.parse(localStorage.getItem('local_pengajuan')||'[]'); } catch(e){ return []; } }

	function addTimeline(item, action, by, note){
		if (!Array.isArray(item.timeline)) item.timeline = [];
		item.timeline.push({ at: now(), by, action, note });
	}

	function assignNomorSurat(item){
		if (item.nomor_surat) return;
		const d = new Date();
		const year = d.getFullYear();
		const seq = String(Math.floor(Math.random()*9000)+1000); // 1000-9999
		item.nomor_surat = `${year}/${seq}`;
	}

	function validateSurat(id, note){
		const all = loadAll();
		const idx = all.findIndex(x => String(x.id) === String(id));
		if (idx === -1) return false;
		const item = all[idx];

		item.validated_by_pendeta = true;
		item.validated = true;
		item.archived = true;
		item.status = 'archived'; // Set status to archived so it appears in Arsip only

		assignNomorSurat(item);

		const currentUser = (()=>{ try { return JSON.parse(localStorage.getItem('currentUser')||'{}'); } catch(e){ return {}; } })();
		const by = currentUser && currentUser.name ? currentUser.name : 'Pendeta';
		addTimeline(item, 'validated_by_pendeta', by, note||'');
		addTimeline(item, 'validated', by, note||'');
		addTimeline(item, 'archived', by, 'Surat diarsipkan setelah validasi final');

		all[idx] = item;
		saveAll(all);
		return true;
	}

	window.PenValidation = { validateSurat };
})();
