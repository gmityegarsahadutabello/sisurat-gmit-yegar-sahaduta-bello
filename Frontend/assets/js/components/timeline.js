// Reusable Timeline Renderer
// Renders friendly, realtime timeline entries for any item with `timeline`
(function(){
  function qs(sel){ return document.querySelector(sel); }
  function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  const LABELS = {
    submitted: 'Pengajuan dibuat oleh Jemaat',
    verified_by_koordinator: 'Diverifikasi oleh Koordinator',
    rejected_by_koordinator: 'Ditolak oleh Koordinator',
    disposisi_to_tatausaha: 'Diteruskan ke Tata Usaha',
    edited_by_tatausaha: 'Diedit oleh Tata Usaha',
    draft_uploaded_by_tatausaha: 'Draft diunggah oleh Tata Usaha',
    final_uploaded_by_tatausaha: 'File final diunggah oleh Tata Usaha',
    disposisi_to_sekretaris: 'Diteruskan ke Sekretaris',
    validated_by_sekretaris: 'Diverifikasi oleh Sekretaris',
    disposisi_to_pendeta: 'Diteruskan ke Pendeta',
    validated_by_pendeta: 'Divalidasi oleh Pendeta',
    validated: 'Validasi final',
    archived: 'Diarsipkan',
  };

  function formatDateTime(ts){
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      const pad = n => String(n).padStart(2,'0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch(e){ return esc(String(ts)); }
  }

  function renderTimeline(container, item){
    const ul = container.querySelector('.timeline-list');
    if (!ul) return;
    ul.innerHTML = '';
    const entries = Array.isArray(item.timeline) ? item.timeline : [];
    entries.sort((a,b) => new Date(a.at||0) - new Date(b.at||0));
    entries.forEach(en => {
      const li = document.createElement('li');
      li.className = 'timeline-item';
      const by = esc(en.by||'-');
      const actionKey = String(en.action||'').trim();
      const actionText = esc(LABELS[actionKey] || actionKey || '-');
      const note = esc(en.note||'');
      li.innerHTML = `
        <div class="d-flex align-items-start gap-3">
          <div class="time small text-muted">${formatDateTime(en.at)}</div>
          <div>
            <div class="fw-bold">${actionText}</div>
            <div class="small text-muted">${by ? `Oleh: ${by}` : ''}${note ? (by? ' — ':'')+`Catatan: ${note}`:''}</div>
          </div>
        </div>`;
      ul.appendChild(li);
    });
  }

  function getItemById(id){
    try {
      const all = JSON.parse(localStorage.getItem('local_pengajuan')||'[]');
      return all.find(x => String(x.id) === String(id));
    } catch(e){ return null; }
  }

  function init(){
    // auto-render for elements with [data-timeline-id]
    qsa('.timeline-fragment[data-timeline-id]').forEach(container => {
      const id = container.getAttribute('data-timeline-id');
      const item = getItemById(id);
      if (item) renderTimeline(container, item);
    });

    // simple realtime: listen to storage updates and re-render affected items
    window.addEventListener('storage', (ev) => {
      if (ev.key === 'local_pengajuan'){
        qsa('.timeline-fragment[data-timeline-id]').forEach(container => {
          const id = container.getAttribute('data-timeline-id');
          const item = getItemById(id);
          if (item) renderTimeline(container, item);
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  // expose for pages that render timeline programmatically
  window.Timeline = { renderTimeline };
})();
