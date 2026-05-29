// Sekretaris preview helper: inline PDF/image support with safe handling
(function(){
  'use strict';

  function el(tag, attrs, txt){
    var e = document.createElement(tag);
    if (attrs && typeof attrs === 'object'){
      Object.keys(attrs).forEach(function(k){
        try { if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]); } catch(_){}
      });
    }
    if (txt !== undefined && txt !== null) e.textContent = String(txt);
    return e;
  }

  var currentObjectUrl = null;

  function revokeCurrentUrl(){
    try { if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl); } catch(e){}
    currentObjectUrl = null;
  }

  function dataUrlToBlob(dataUrl){
    try {
      var parts = dataUrl.split(',');
      if (parts.length < 2) return null;
      var meta = parts[0];
      var b64 = parts[1];
      var mimeMatch = meta.match(/data:([^;]+);/);
      var mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      var bin = atob(b64);
      var len = bin.length;
      var u8 = new Uint8Array(len);
      for (var i=0;i<len;i++) u8[i] = bin.charCodeAt(i);
      return new Blob([u8], { type: mime });
    } catch(e){ return null; }
  }

  function looksLikeHttp(u){ return typeof u === 'string' && (u.indexOf('http://') === 0 || u.indexOf('https://') === 0); }

  function safeText(v){ return v === undefined || v === null ? '' : String(v); }

  async function renderPreview(container, item){
    revokeCurrentUrl();
    if (!container) return;
    container.innerHTML = '';
    if (!item){ container.textContent = 'Data tidak ditemukan'; return; }

    // Resolve file value
    var finalFile = item.final_file || (item.files && item.files.final) || item.final_file_url || item.file_url || '';
    if (finalFile && typeof finalFile === 'object') finalFile = finalFile.url || finalFile.data || finalFile.file_url || '';

    // If we don't have a usable file URL yet, try the backend via the API client to request a presigned URL
    if ((!finalFile || typeof finalFile !== 'string' || finalFile.length === 0) && (item._id || item.id) && window.API && API.pengajuan && API.pengajuan.getById){
      try {
        var pid = item._id || item.id;
        var j = await API.pengajuan.getById(pid).catch(function(e){ console.warn('SekPreview: API.pengajuan.getById failed', e); return null; });
        if (j && j.file_url) finalFile = j.file_url;
      } catch(e){ console.warn('SekPreview: could not obtain presigned file_url via API', e); }
    }

    try {
      if (typeof finalFile === 'string' && finalFile.length > 0){
        var lower = finalFile.toLowerCase();
        var isData = lower.indexOf('data:') === 0;
        var isHttp = looksLikeHttp(finalFile);
        var isPdf = isData ? lower.indexOf('data:application/pdf') === 0 : lower.endsWith('.pdf');
        var isImage = isData ? lower.indexOf('data:image/') === 0 : !!lower.match(/\.(jpg|jpeg|png|gif)$/);

        // DATA URL handling (base64)
        if (isData){
          // PDF or image from data URL
          if (isPdf){
            var blob = dataUrlToBlob(finalFile);
            if (blob){ currentObjectUrl = URL.createObjectURL(blob); }
            var src = currentObjectUrl || finalFile;
            var wrap = el('div'); wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
            var btnRow = el('div'); btnRow.style.cssText = 'display:flex;gap:8px;align-items:center;';
            var btnOpen = el('button', { class: 'btn btn-primary btn-sm', type: 'button' }); btnOpen.innerHTML = '<i class="bi bi-box-arrow-up-right"></i> Buka di Tab Baru';
            btnOpen.addEventListener('click', function(){ try{ window.open(src, '_blank'); } catch(e){} });
            btnRow.appendChild(btnOpen);
            var btnDl = el('a', { class: 'btn btn-outline-primary btn-sm', href: src, download: item.final_file_name || item.file_name || 'surat' }); btnDl.innerHTML = '<i class="bi bi-download"></i> Unduh'; btnRow.appendChild(btnDl);
            wrap.appendChild(btnRow);
            var iframe = el('iframe', { src: src }); iframe.style.cssText = 'width:100%;height:600px;border:1px solid #e0e0e0;border-radius:6px;';
            wrap.appendChild(iframe);
            container.appendChild(wrap);
            return;
          }
          if (isImage){
            var img = el('img', { src: finalFile, alt: item.final_file_name || item.file_name || 'surat' });
            img.style.cssText = 'max-width:100%;height:auto;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.08);';
            img.onerror = function(){ container.innerHTML = '<p class="text-danger">Gagal memuat gambar.</p>'; };
            container.appendChild(img);
            var dl = el('a', { href: finalFile, download: item.final_file_name || item.file_name || 'surat', class: 'btn btn-outline-primary btn-sm mt-2' }); dl.innerHTML = '<i class="bi bi-download"></i> Unduh'; container.appendChild(dl);
            return;
          }
        }

        // HTTP(S) URL handling (presigned S3 or remote) - prefer embedding the presigned URL directly in an iframe
        if (isHttp){
          var srcUrl = finalFile;
          var wrap = el('div'); wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
          var btnRow = el('div'); btnRow.style.cssText = 'display:flex;gap:8px;align-items:center;';
          var btnOpen = el('button', { class: 'btn btn-primary btn-sm', type: 'button' }); btnOpen.innerHTML = '<i class="bi bi-box-arrow-up-right"></i> Buka di Tab Baru';
          btnOpen.addEventListener('click', function(){ try{ window.open(srcUrl, '_blank'); } catch(e){} });
          btnRow.appendChild(btnOpen);
          var btnDlDirect = el('a', { href: srcUrl, target: '_blank', class: 'btn btn-outline-primary btn-sm' }); btnDlDirect.innerHTML = '<i class="bi bi-download"></i> Unduh'; btnRow.appendChild(btnDlDirect);
          wrap.appendChild(btnRow);

          var iframe = el('iframe', { src: srcUrl });
          iframe.style.cssText = 'width:100%;height:600px;border:1px solid #e0e0e0;border-radius:6px;';
          wrap.appendChild(iframe);
          container.appendChild(wrap);
          return;
        }
      }

      // Draft text
      var draft = item.draft_surat || (item.files && item.files.draft_text);
      if (draft){ var pre = el('div'); pre.style.whiteSpace='pre-wrap'; pre.style.padding='1rem'; pre.style.background='#f8f9fa'; pre.style.borderRadius='6px'; pre.textContent = safeText(draft); container.appendChild(pre); return; }

      // Metadata
      var meta = el('div'); meta.style.cssText = 'padding:1rem;background:#f8f9fa;border-radius:6px;';
      var keys = ['nomor','tipe','nama','keterangan'];
      keys.forEach(function(k){ if (item[k]){ var p = el('p'); p.innerHTML = '<strong>' + (k.charAt(0).toUpperCase()+k.slice(1)) + ':</strong> ' + safeText(item[k]); meta.appendChild(p); }});
      container.appendChild(meta);

    } catch(err){ console.error('preview error', err); container.innerHTML = '<p class="text-danger">Preview gagal.</p>'; }
  }

  // expose globally
  window.SekPreview = { renderPreview: renderPreview };

})();
