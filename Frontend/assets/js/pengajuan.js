// Pengajuan page script (render per-tipe, handle saksi 1/2 dan upload).
document.addEventListener('DOMContentLoaded', () => {
  const tipeList = document.getElementById('tipe-list');
  const formTitle = document.getElementById('form-title');
  const formType = document.getElementById('form-type');
  const form = document.getElementById('pengajuan-form');
  const alertArea = document.getElementById('alert-area');
  const submitBtn = document.getElementById('submit-btn');
  const resetBtn = document.getElementById('reset-btn');
  const spinner = submitBtn.querySelector('.spinner-border');
  const fieldsWrap = document.getElementById('form-fields');

  function showAlert(type, msg) {
    alertArea.innerHTML = `<div class="alert alert-${type}" role="alert">${msg}</div>`;
  }
  function clearAlert() { alertArea.innerHTML = ''; }

  // Generic validation helpers
  function setInvalid(el, message){
    if (!el) return;
    el.classList.add('is-invalid');
    // attach or update feedback element
    let fb = el.nextElementSibling;
    if (!fb || !fb.classList || !fb.classList.contains('invalid-feedback')){
      fb = document.createElement('div');
      fb.className = 'invalid-feedback';
      el.parentElement && el.parentElement.appendChild(fb);
    }
    fb.textContent = message || 'Wajib diisi.';
  }
  function clearInvalid(el){ if (el){ el.classList.remove('is-invalid'); const fb = el.nextElementSibling; if (fb && fb.classList && fb.classList.contains('invalid-feedback')) fb.textContent = ''; } }
  function isEmpty(value){ return value == null || String(value).trim() === ''; }
  function validateFormRequired(){
    let ok = true;
    // All required inputs/selects/textareas must be filled; catatan is optional
    const requiredEls = form.querySelectorAll('[required]');
    requiredEls.forEach(el => {
      clearInvalid(el);
      if (el.type === 'file'){
        const needed = el.required === true || el.getAttribute('required') !== null;
        if (needed && (!el.files || el.files.length === 0)) { setInvalid(el, 'Harap unggah file.'); ok = false; }
        return;
      }
      if (isEmpty(el.value)) { setInvalid(el, 'Wajib diisi.'); ok = false; }
    });

    // Explicitly ensure catatan remains optional even if present in DOM
    const catatanEl = document.getElementById('catatan');
    if (catatanEl) { catatanEl.removeAttribute('required'); clearInvalid(catatanEl); }

    return ok;
  }

  // Default render helpers
  function input(name, label, attrs = '') {
    return `<div class="mb-3">
      <label class="form-label">${label}</label>
      <input ${attrs} class="form-control" name="${name}" id="${name}">
    </div>`;
  }
  function textarea(name, label, attrs = '') {
    return `<div class="mb-3">
      <label class="form-label">${label}</label>
      <textarea ${attrs} class="form-control" name="${name}" id="${name}"></textarea>
    </div>`;
  }
  function alamatFields(prefix = '') {
    // prefix used to support multiple saksi (ex: s1_nama, s1_jk, ...)
    const p = prefix ? prefix + '_' : '';
    return `
      ${input(p+'nama','Nama lengkap', 'type="text" required')}
      ${input(p+'tempat_lahir','Tempat Lahir','type="text" required')}
      ${input(p+'tgl_lahir','Tanggal Lahir','type="date" required')}
      <div class="mb-3">
        <label class="form-label">Jenis Kelamin</label>
        <select class="form-select" name="${p}jk" id="${p}jk" required>
          <option value="">Pilih</option>
          <option value="Laki-laki">Laki-laki</option>
          <option value="Perempuan">Perempuan</option>
        </select>
      </div>
      ${input(p+'agama','Agama','type="text" required')}
      ${input(p+'jalan','Alamat - Nama jalan','type="text" required')}
      <div class="row g-2">
        <div class="col"><input class="form-control" name="${p}rt" id="${p}rt" placeholder="RT" required></div>
        <div class="col"><input class="form-control" name="${p}rw" id="${p}rw" placeholder="RW" required></div>
      </div>
      ${input(p+'kelurahan','Kelurahan','type="text" required')}
      ${input(p+'kecamatan','Kecamatan','type="text" required')}
      ${input(p+'kota','Kota / Kabupaten','type="text" required')}
    `;
  }

  // Render functions per type
  function render_saksi_generic(typeLabel) {
    formTitle.textContent = `Formulir Pengajuan - ${typeLabel}`;
    formType.value = typeLabel === 'Surat Saksi Nikah' ? 'saksi-nikah' : 'saksi-baptis';
    const perihalValue = typeLabel === 'Surat Saksi Nikah' ? 'Saksi Nikah' : 'Saksi Baptis';
    fieldsWrap.innerHTML = `
      <div class="mb-3">
        <label class="form-label">Perihal</label>
        <input type="text" class="form-control" name="perihal" id="perihal" value="${perihalValue}" readonly>
      </div>
      <div class="mb-3">
        <label class="form-label">Opsi Saksi</label>
        <select id="saksi-count" class="form-select">
          <option value="1">Saksi tunggal</option>
          <option value="2">Saksi suami-istri (2 orang)</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">Catatan (opsional)</label>
        <textarea id="catatan" name="catatan" rows="3" class="form-control" placeholder="Catatan tambahan (opsional)"></textarea>
      </div>

      <div id="saksi-forms">
        <div class="saksi-item p-3 border rounded mb-3">
          <h6 class="mb-2">Saksi 1</h6>
          ${alamatFields('s1')}
        </div>
      </div>
    `;
    // wire change
    document.getElementById('saksi-count').addEventListener('change', (e) => {
      const val = e.target.value;
      const wrapper = document.getElementById('saksi-forms');
      if (val === '2') {
        // add second saksi
        if (!document.getElementById('s2_nama')) {
          wrapper.insertAdjacentHTML('beforeend', `
            <div class="saksi-item p-3 border rounded mb-3">
              <h6 class="mb-2">Saksi 2</h6>
              ${alamatFields('s2')}
            </div>`);
        }
      } else {
        // remove saksi 2
        const s2 = document.querySelectorAll('#saksi-forms .saksi-item')[1];
        if (s2) s2.remove();
      }
    });
  }

  function render_rekomendasi_or_keterangan(mode) {
    // support 'rekomendasi' (rekomendasi lainnya), 'keterangan' (keterangan lainnya)
    // and 'rekomendasi-menikah' (rekomendasi menikah di tempat lain) - uses same fields
    const label = mode === 'rekomendasi' ? 'Surat Rekomendasi Lainnya' : (mode === 'rekomendasi-menikah' ? 'Surat Rekomendasi Menikah (di tempat lain)' : 'Surat Keterangan Lainnya');
    formTitle.textContent = `Formulir Pengajuan - ${label}`;
    formType.value = mode;
    fieldsWrap.innerHTML = `
      ${input('perihal','Perihal','type="text" required')}
      ${/* nama & ttl dihapus — alamatFields('') sudah menyertakan */''}
      ${alamatFields('')}
      <!-- Umur dihitung otomatis dari tanggal lahir dan tanggal pengajuan -->
      <div class="mb-3">
        <label class="form-label">Catatan (opsional)</label>
        <textarea id="catatan" name="catatan" rows="3" class="form-control" placeholder="Catatan tambahan (opsional)"></textarea>
      </div>
    `;
  }

  function render_rekomendasi_kegiatan() {
    formTitle.textContent = 'Formulir Pengajuan - Surat Rekomendasi Mengikuti Kegiatan';
    formType.value = 'rekomendasi-kegiatan';
    fieldsWrap.innerHTML = `
      ${input('perihal','Perihal','type="text" required')}
      ${input('lokasi','Lokasi kegiatan','type="text" required')}
      <div class="row g-2">
        <div class="col">${input('tgl_mulai','Tanggal mulai','type="date" required')}</div>
        <div class="col">${input('tgl_selesai','Tanggal selesai','type="date" required')}</div>
      </div>
      ${/* nama & ttl dihapus — alamatFields('') sudah menyertakan */''}
      ${alamatFields('')}
      <!-- Umur dihitung otomatis -->
      <div class="mb-3">
        <label class="form-label">Catatan (opsional)</label>
        <textarea id="catatan" name="catatan" rows="3" class="form-control" placeholder="Catatan tambahan (opsional)"></textarea>
      </div>
    `;
  }

  function render_lainnya() {
    formTitle.textContent = 'Formulir Pengajuan - Surat Lainnya';
    formType.value = 'lainnya';
    fieldsWrap.innerHTML = `
      ${input('perihal','Perihal','type="text" required')}
      ${input('untuk','Untuk / Kepada','type="text" required')}
      ${textarea('keperluan','Keperluan','rows="3" required')}
      <div class="mb-3">
        <label class="form-label">Unggah surat pengajuan (file utama)</label>
        <input type="file" id="file_utama" name="file_utama" class="form-control" accept=".pdf,.doc,.docx,image/*" required>
      </div>
      <div class="mb-3">
        <label class="form-label">Dokumen pendukung (opsional)</label>
        <input type="file" id="file_sup1" name="file_sup1" class="form-control mb-2" accept=".pdf,.doc,.docx,image/*">
        <input type="file" id="file_sup2" name="file_sup2" class="form-control mb-2" accept=".pdf,.doc,.docx,image/*">
        <input type="file" id="file_sup3" name="file_sup3" class="form-control mb-2" accept=".pdf,.doc,.docx,image/*">
        <input type="file" id="file_sup4" name="file_sup4" class="form-control" accept=".pdf,.doc,.docx,image/*">
      </div>
      <div class="mb-3">
        <label class="form-label">Catatan (opsional)</label>
        <textarea id="catatan" name="catatan" rows="3" class="form-control" placeholder="Catatan tambahan (opsional)"></textarea>
      </div>
    `;
  }

  // handle type selection
  tipeList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-type]');
    if (!btn) return;
    Array.from(tipeList.querySelectorAll('[data-type]')).forEach(el => el.classList.remove('active'));
    btn.classList.add('active');

    const type = btn.getAttribute('data-type');
    switch (type) {
      case 'saksi-nikah': render_saksi_generic('Surat Saksi Nikah'); break;
      case 'saksi-baptis': render_saksi_generic('Surat Saksi Baptis'); break;
      case 'rekomendasi': render_rekomendasi_or_keterangan('rekomendasi'); break;
      case 'keterangan': render_rekomendasi_or_keterangan('keterangan'); break;
      case 'rekomendasi-menikah': render_rekomendasi_or_keterangan('rekomendasi-menikah'); break;
      case 'rekomendasi-kegiatan': render_rekomendasi_kegiatan(); break;
      case 'lainnya': render_lainnya(); break;
      default: fieldsWrap.innerHTML = ''; break;
    }
  });

  // Prefill user data if available (api.js may provide apiGet)
  (async () => {
    try {
      if (typeof apiGet === 'function') {
        const user = await apiGet('/user/me');
        if (user) {
          // attempt to set default name / nik fields when present
          const nameField = () => document.querySelector('#pengajuan-form input[name="nama"]') ||
                                  document.getElementById('form-nama');
          if (nameField() && user.nama) nameField().value = user.nama;
        }
      }
    } catch (err) { /* ignore */ }
  })();

  // reset
  resetBtn.addEventListener('click', () => {
    form.reset();
    clearAlert();
    // clear selected type highlight
    Array.from(tipeList.querySelectorAll('[data-type]')).forEach(el => el.classList.remove('active'));
    formTitle.textContent = 'Formulir Pengajuan';
    formType.value = '';
    fieldsWrap.innerHTML = '';
  });

  // validation & submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const type = formType.value || '';
    if (!type) { showAlert('danger', 'Pilih tipe surat terlebih dahulu.'); return; }

    // Global required validation (except catatan)
    if (!validateFormRequired()) { showAlert('danger','Lengkapi semua field yang wajib diisi.'); return; }

    // Helper to read file as Base64
    const readFileAsDataURL = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    // Build payload object
    const payload = {
      type,
      form: {},
      files: {}
    };

    // Helper to add to form data
    const addToForm = (name, val) => {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        payload.form[name] = val;
      }
    };

    // handle by type
    if (type === 'saksi-nikah' || type === 'saksi-baptis') {
      // Save perihal
      const perihalEl = document.getElementById('perihal');
      if (perihalEl) addToForm('perihal', perihalEl.value);
      
      // gather saksi1
      const s1 = {};
      ['nama','tempat_lahir','tgl_lahir','jk','agama','jalan','rt','rw','kelurahan','kecamatan','kota'].forEach(k => {
        s1[k] = (document.getElementById('s1_'+k) || {}).value || '';
      });
      if (!s1.nama) { showAlert('danger','Isi data Saksi 1 lengkap.'); return; }
      
      payload.form.saksi_count = document.getElementById('saksi-count').value;
      payload.form.saksi1 = s1;

      // optional saksi2
      const s2El = document.getElementById('s2_nama');
      if (s2El) {
        const s2 = {};
        ['nama','tempat_lahir','tgl_lahir','jk','agama','jalan','rt','rw','kelurahan','kecamatan','kota'].forEach(k => {
          s2[k] = (document.getElementById('s2_'+k) || {}).value || '';
        });
        if (!s2.nama) { showAlert('danger','Isi data Saksi 2 lengkap.'); return; }
        payload.form.saksi2 = s2;
      }
    } else if (type === 'rekomendasi' || type === 'keterangan' || type === 'rekomendasi-menikah') {
      // Append known fields including jenis kelamin (jk)
      ['perihal','nama','tempat_lahir','tgl_lahir','jk','agama','jalan','rt','rw','kelurahan','kecamatan','kota'].forEach(r => {
        const el = document.getElementById(r); if (el) addToForm(r, el.value);
      });
    } else if (type === 'rekomendasi-kegiatan') {
      ['perihal','lokasi','tgl_mulai','tgl_selesai','nama','tempat_lahir','tgl_lahir','jk','agama','jalan','rt','rw','kelurahan','kecamatan','kota'].forEach(r => {
        const el = document.getElementById(r); if (el) addToForm(r, el.value);
      });
    } else if (type === 'lainnya') {
      const perihal = document.getElementById('perihal');
      const untuk = document.getElementById('untuk');
      const keperluan = document.getElementById('keperluan');
      
      addToForm('perihal', perihal.value);
      addToForm('untuk', untuk.value);
      addToForm('keperluan', keperluan.value);
      
      const fileUtama = document.getElementById('file_utama');
      if (!fileUtama || !fileUtama.files || fileUtama.files.length === 0) { 
        setInvalid(fileUtama,'Harap unggah file utama.'); 
        showAlert('danger','Unggah file utama.'); 
        return; 
      }
      
      // Handle file upload
      try {
        const file = fileUtama.files[0];
        const base64 = await readFileAsDataURL(file);
        payload.files.draft = {
          data: base64,
          name: file.name,
          mime: file.type,
          size: file.size,
          uploaded_at: new Date()
        };
      } catch (e) {
        console.error('File read error', e);
        showAlert('danger', 'Gagal membaca file.');
        return;
      }

      // Support docs
      for (let i=1; i<=4; i++){
         const fSup = document.getElementById(`file_sup${i}`);
         if (fSup && fSup.files && fSup.files[0]) {
            try {
              const f = fSup.files[0];
              const b64 = await readFileAsDataURL(f);
              payload.form[`file_sup${i}`] = {
                data: b64,
                name: f.name,
                mime: f.type,
                size: f.size
              };
            } catch(e){}
         }
      }
    }

    // Get current user data
    let currentUser = null;
    try {
      const raw = localStorage.getItem('currentUser');
      currentUser = raw ? JSON.parse(raw) : null;
    } catch (e) {}

    const pemohonNama = (currentUser && (currentUser.nama || currentUser.name)) || '';
    const pemohonNik = (currentUser && currentUser.nik) || '';
    const pemohonEmail = (currentUser && currentUser.email) || '';
    const pemohonRayon = (currentUser && currentUser.rayon) || '';

    payload.user_id = (currentUser && (currentUser.id || currentUser._id)) || '';
    payload.user_nik = pemohonNik;
    payload.user_nama = pemohonNama;
    payload.user_email = pemohonEmail;
    payload.user_rayon = pemohonRayon;
    payload.rayon = pemohonRayon;
    payload.status = 'proses'; // Set valid initial status

    if (pemohonNama) addToForm('pemohon_nama', pemohonNama);
    if (pemohonNik) addToForm('pemohon_nik', pemohonNik);
    if (pemohonEmail) addToForm('email', pemohonEmail);
    if (pemohonRayon) addToForm('rayon', pemohonRayon);

    // Compute age
    function computeAgeFromDob(dobStr, refDate = new Date()){
      if (!dobStr) return null;
      const d = new Date(dobStr);
      if (isNaN(d)) return null;
      let age = refDate.getFullYear() - d.getFullYear();
      const m = refDate.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && refDate.getDate() < d.getDate())) age--;
      return age >= 0 ? age : null;
    }

    const applicantDobEl = document.getElementById('tgl_lahir') || document.getElementById('form-tgl_lahir');
    const dobVal = applicantDobEl ? applicantDobEl.value : null;
    const ageVal = computeAgeFromDob(dobVal, new Date());
    if (ageVal !== null) addToForm('umur', String(ageVal));

    const catatanEl = document.getElementById('catatan');
    if (catatanEl && String(catatanEl.value || '').trim()) addToForm('catatan', catatanEl.value.trim());

    try {
      spinner.classList.remove('d-none');
      submitBtn.setAttribute('disabled', 'disabled');

      // Use API client
      const res = await API.pengajuan.create(payload);
      
      if (res && (res.id || res._id)) {
        const pengajuanId = res.id || res._id;
        showAlert('success', 'Pengajuan berhasil dikirim. Mengarahkan ke detail...');
        form.reset();
        
        // Redirect to detail page to show uploaded files
        setTimeout(() => {
            window.location.href = `pengajuan-detail.html?id=${pengajuanId}`;
        }, 1500);
      } else {
        throw new Error('Gagal mengirim pengajuan.');
      }

    } catch (err) {
      console.error(err);
      showAlert('danger', err.message || 'Terjadi kesalahan saat mengirim pengajuan.');
    } finally {
      spinner.classList.add('d-none');
      submitBtn.removeAttribute('disabled');
    }
  });
});
