// Load Navbar Component
fetch('assets/components/navbar.html')
    .then(res => res.text())
    .then(html => {
        document.querySelector('.navbar').innerHTML = html;
    });

// helper: get current user from localStorage
function getCurrentUser() {
    try {
        const raw = localStorage.getItem('currentUser');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) { return null; }
}

// protect page
(function protectPage() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
    }
})();

// Load Rekapitulasi Data
async function loadRekap() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        // Get all submissions for this user
        const userId = currentUser.id || currentUser.nik || currentUser._id;
        console.log('🔍 Dashboard - Loading rekap for user_id:', userId);
        
        const myPengajuan = await API.pengajuan.getAll({ user_id: userId });
        console.log('🔍 Dashboard - Total pengajuan:', myPengajuan.length);
        
        const semua = myPengajuan.length;
        const diterima = myPengajuan.filter(p => {
          const s = (p.status||'').toLowerCase();
          return s === 'validated_by_pendeta' || s === 'validated' || s === 'archived' || p.validated_by_pendeta === true;
        }).length;
        const proses = myPengajuan.filter(p => {
          const s = (p.status||'').toLowerCase();
          return s === 'proses' || s === 'diterima' || s === 'verified_by_koordinator' || s.includes('disposisi_') || s === 'verified';
        }).length;
        const ditolak = myPengajuan.filter(p => p.status === 'ditolak').length;
        
        // Surat Masuk (Finished/Rejected)
        const suratMasuk = myPengajuan.filter(p => {
             const s = (p.status||'').toLowerCase();
             return s === 'validated_by_pendeta' || s === 'validated' || s === 'archived' || s === 'ditolak';
        }).length;

        document.getElementById('total-semua').textContent = semua;
        document.getElementById('total-diterima').textContent = diterima;
        document.getElementById('total-proses').textContent = proses;
        document.getElementById('total-ditolak').textContent = ditolak;
        document.getElementById('total-masuk').textContent = suratMasuk;

    } catch (err) {
        console.error('Gagal memuat rekap dashboard:', err);
    }
}

// Load Biodata Jemaat
async function loadBiodata() {
    try {
        const localUser = getCurrentUser();
        if (!localUser) return;

        // Try to get fresh data from API
        let user = localUser;
        try {
            const userId = localUser.id || localUser._id;
            if (userId) {
                console.log('🔄 Fetching fresh user data for:', userId);
                const freshUser = await API.users.getById(userId);
                if (freshUser) {
                    user = { ...localUser, ...freshUser };
                    // Update local storage with fresh data
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    console.log('✅ Fresh user data loaded:', user);
                }
            }
        } catch (e) {
            console.warn('Failed to fetch fresh user data:', e);
        }

        // Update display fields
        const userName = user.nama || user.name || '-';
        document.getElementById('bio-nama').innerHTML = `<i class="bi bi-person-circle me-1 text-primary"></i>${userName}`;
        document.getElementById('bio-nik').textContent = user.nik || '-';
        document.getElementById('bio-rayon').textContent = user.rayon || '-';
        document.getElementById('edit-nama').value = user.nama || user.name || '';
        document.getElementById('edit-email').value = user.email || '';
        
        // Update photo displays
        const imgSrc = user.foto || 'assets/img/logo-gmit.png';
        console.log('📸 Setting photo to:', imgSrc.substring(0, 50) + '...');
        
        const navImg = document.getElementById('profile-img');
        const profilePreview = document.getElementById('photo-preview');
        if (navImg) {
            navImg.src = imgSrc;
            navImg.onerror = () => { navImg.src = 'assets/img/logo-gmit.png'; };
        }
        if (profilePreview) {
            profilePreview.src = imgSrc;
            profilePreview.onerror = () => { profilePreview.src = 'assets/img/logo-gmit.png'; };
        }

        const profileCardPhoto = document.querySelector('.profile-photo');
        if (profileCardPhoto) {
            profileCardPhoto.style.backgroundImage = `url("${imgSrc}")`;
            profileCardPhoto.style.backgroundSize = 'cover';
            profileCardPhoto.style.backgroundPosition = 'center';
            profileCardPhoto.style.backgroundRepeat = 'no-repeat';
        }
    } catch (err) {
        console.error('❌ Gagal memuat biodata:', err);
    }
}

// Save Edit Profil
const form = document.getElementById('profile-form');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nama = document.getElementById('edit-nama').value.trim();
        const email = document.getElementById('edit-email').value.trim();
        const passwordLama = document.getElementById('pass-lama').value;
        const passwordBaru = document.getElementById('pass-baru').value;

        if (!nama || !email) { alert('Nama dan Email wajib diisi.'); return; }

        try {
            const currentUser = getCurrentUser();
            if (!currentUser || !currentUser.id) {
                alert('Sesi tidak valid.');
                return;
            }

        const updates = {
            name: nama,
            email: email
        };
        if (passwordBaru) {
            if (passwordBaru.length < 6) { alert('Password minimal 6 karakter.'); return; }
            updates.password = passwordBaru;
        }

        // Call API
        const userId = currentUser.id || currentUser._id;
        const updatedUser = await API.users.update(userId, updates);
        
        // Update local storage with all fields
        const mergedUser = { 
            ...currentUser, 
            ...updatedUser, 
            nama: updatedUser.name,
            id: updatedUser.id || updatedUser._id
        };
        localStorage.setItem('currentUser', JSON.stringify(mergedUser));

        alert('✅ Profil berhasil diperbarui!');
        document.getElementById('pass-lama').value = '';
        document.getElementById('pass-baru').value = '';
        loadBiodata();        } catch (err) {
            console.error('Error update profil:', err);
            alert('Gagal memperbarui profil: ' + err.message);
        }
    });
}

// TAB SWITCHING
document.querySelectorAll('.profile-tabs li').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.profile-tabs li').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(panel => panel.classList.add('hidden'));
        const target = document.getElementById(tab.getAttribute('data-tab'));
        if (target) target.classList.remove('hidden');
    });
});

// Photo preview
const photoFile = document.getElementById('photo-file');
if (photoFile) {
    photoFile.addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (!f) return;
        if (f.size > 2 * 1024 * 1024) { // 2MB
            alert('Ukuran file terlalu besar (maks 2MB).');
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const preview = document.getElementById('photo-preview');
            if (preview) preview.src = ev.target.result;
        };
        reader.readAsDataURL(f);
    });
}

// Submit foto
const photoForm = document.getElementById('photo-form');
if (photoForm) {
    photoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = document.getElementById('photo-file').files[0];
        if (!f) return alert('Pilih foto terlebih dulu.');

        // Validate file size (max 2MB)
        if (f.size > 2 * 1024 * 1024) {
            alert('Ukuran file terlalu besar (maksimal 2MB).');
            return;
        }

        // Validate file type
        if (!f.type.startsWith('image/')) {
            alert('File harus berupa gambar (jpg, png, dll).');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const dataUrl = ev.target.result;
                const currentUser = getCurrentUser();
                
                if (!currentUser) {
                    alert('Sesi tidak valid. Silakan login kembali.');
                    return;
                }
                
                const userId = currentUser.id || currentUser._id;
                if (!userId) {
                    alert('User ID tidak ditemukan.');
                    return;
                }

                console.log('📸 Uploading photo for user:', userId);
                
                // Update via API
                const updatedUser = await API.users.update(userId, { foto: dataUrl });
                console.log('✅ Photo uploaded successfully:', updatedUser);
                
                // Update local storage
                const mergedUser = { 
                    ...currentUser, 
                    foto: dataUrl,
                    id: userId
                };
                localStorage.setItem('currentUser', JSON.stringify(mergedUser));
                
                alert('✅ Foto profil berhasil disimpan!');
                
                // Reload biodata to update all photo displays
                await loadBiodata();
                
                // Clear file input
                document.getElementById('photo-file').value = '';
                
            } catch (err) {
                console.error('❌ Gagal menyimpan foto:', err);
                alert('Gagal menyimpan foto: ' + (err.message || 'Terjadi kesalahan'));
            }
        };
        reader.onerror = () => {
            alert('Gagal membaca file. Silakan coba lagi.');
        };
        reader.readAsDataURL(f);
    });
}

// INIT
loadRekap();
loadBiodata();
