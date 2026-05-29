// Pendeta preview helper: render final_file (dataURL) or draft text
(function(){
  function el(tag, attrs, txt){ 
    const e = document.createElement(tag); 
    if (attrs) Object.entries(attrs).forEach(([k,v]) => e.setAttribute(k,v)); 
    if (txt) e.textContent = txt; 
    return e; 
  }

  // Track created object URLs to prevent memory leaks
  let currentObjectUrl = null;

  function renderPreview(container, item){
    // Clean up previous object URL if any
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }

    container.innerHTML = '';
    if (!item) {
      container.appendChild(el('p', {class:'text-muted'}, 'Item tidak ditemukan'));
      return;
    }

    // Prefer server-provided presigned URL first (file_url / final_file_url), then final_file data URL
    const fileUrl = item.file_url || item.final_file_url || item.file_url_signed || '';
    if (fileUrl && typeof fileUrl === 'string' && fileUrl.length > 0){
      const wrapper = el('div', {style:'display:flex;flex-direction:column;gap:8px;'});
      const btnRow = el('div', {style:'display:flex;gap:8px;align-items:center;'});
      const btnOpen = el('button', { class: 'btn btn-sm btn-outline-primary' }); btnOpen.innerHTML = '<i class="bi bi-box-arrow-up-right"></i> Buka di Tab Baru';
      btnOpen.addEventListener('click', function(){ try{ window.open(fileUrl, '_blank'); } catch(e){} });
      const btnDl = el('a', { href: fileUrl, target: '_blank', class: 'btn btn-sm btn-outline-secondary' }); btnDl.innerHTML = '<i class="bi bi-download"></i> Unduh';
      btnRow.appendChild(btnOpen); btnRow.appendChild(btnDl);
      wrapper.appendChild(btnRow);
      const iframe = el('iframe', { src: fileUrl, style: 'width:100%;height:600px;border:1px solid #e7f1ff;border-radius:8px;', title: 'PDF Preview' });
      wrapper.appendChild(iframe);
      container.appendChild(wrapper);
      return;
    }

    // prefer final_file
    if (item.final_file){
      const dataURL = item.final_file;
      const isPDF = dataURL.startsWith('data:application/pdf');
      const isImage = dataURL.startsWith('data:image/');

      if (isPDF){
        // Convert dataURL to Blob and create object URL
        try {
          const arr = dataURL.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while(n--) u8arr[n] = bstr.charCodeAt(n);
          const blob = new Blob([u8arr], {type:mime});
          const objURL = URL.createObjectURL(blob);
          currentObjectUrl = objURL;

          const wrapper = el('div', {style:'position:relative;'});
          const iframe = el('iframe', {
            src: objURL,
            style: 'width:100%;height:600px;border:1px solid #e7f1ff;border-radius:8px;',
            title: 'PDF Preview'
          });
          wrapper.appendChild(iframe);

          // Add "Open in new tab" button
          const btnOpen = el('button', {
            class: 'btn btn-sm btn-outline-primary mt-2',
            style: 'display:block;'
          });
          btnOpen.innerHTML = '<i class="bi bi-box-arrow-up-right"></i> Buka di Tab Baru';
          btnOpen.addEventListener('click', () => {
            window.open(objURL, '_blank');
          });
          wrapper.appendChild(btnOpen);

          container.appendChild(wrapper);
        } catch(e){
          container.appendChild(el('p', {class:'text-danger'}, 'Gagal memuat PDF: '+e.message));
        }
      } else if (isImage){
        const img = el('img', {
          src: dataURL,
          alt: 'Preview Gambar',
          style: 'max-width:100%;height:auto;border:1px solid #e7f1ff;border-radius:8px;'
        });
        container.appendChild(img);
      } else {
        container.appendChild(el('p', {class:'text-muted'}, 'Format file tidak didukung untuk preview inline.'));
        const link = el('a', {href:dataURL, download:'file', class:'btn btn-sm btn-outline-primary'}, 'Download File');
        container.appendChild(link);
      }
    } else if (item.draft_text){
      const pre = el('pre', {style:'white-space:pre-wrap;background:#f8f9fa;padding:12px;border-radius:8px;border:1px solid #e7f1ff;'}, item.draft_text);
      container.appendChild(pre);
    } else {
      container.appendChild(el('p', {class:'text-muted'}, 'Tidak ada file atau draft untuk ditampilkan.'));
    }
  }

  // expose globally
  window.PenPreview = { renderPreview };
})();
