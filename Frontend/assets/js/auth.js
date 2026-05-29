// Inject navbar fragment (same pattern used elsewhere)
fetch('assets/components/navbar.html')
  .then(res => res.text())
  .then(html => { const el = document.querySelector('.navbar'); if (el) el.innerHTML = html; })
  .catch(() => {});

// Helper: show alert
function showAlert(type, message) {
  const area = document.getElementById('alert-area');
  if (!area) return;
  area.innerHTML = `<div class="alert alert-${type} alert-sm" role="alert">${message}</div>`;
}

// Helper: get dashboard URL based on role
function getDashboardByRole(role) {
  const dashboardMap = {
    'jemaat': 'dashboard.html',
    'koordinator': 'pages/koordinator/dashboard.html',
    'tatausaha': 'pages/tatausaha/dashboard-tatausaha.html',
    'sekretaris': 'pages/sekretaris/dashboard-sekretaris.html',
    'pendeta': 'pages/pendeta/dashboard-pendeta.html',
    'admin': 'pages/admin/dashboard-admin.html'
  };
  
  // Default to jemaat dashboard if role not found
  return dashboardMap[role] || 'dashboard.html';
}

document.addEventListener('DOMContentLoaded', () => {
  // --- Register form handling ---
  const regForm = document.getElementById('register-form');
  if (regForm) {
    const btn = document.getElementById('btn-submit');
    const spinner = btn ? btn.querySelector('.spinner-border') : null;

    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // read values
      const rayon = document.getElementById('rayon');
      const nik = document.getElementById('nik');
      const nama = document.getElementById('nama');
      const email = document.getElementById('email');
      const password = document.getElementById('password');
      const password2 = document.getElementById('password2');

      let valid = true;

      // Validations
      if (!rayon.value.trim()) { 
        rayon.classList.add('is-invalid'); 
        valid = false; 
      } else { 
        rayon.classList.remove('is-invalid'); 
      }

      if (!/^[0-9]{6,20}$/.test(nik.value.trim())) { 
        nik.classList.add('is-invalid'); 
        valid = false; 
      } else { 
        nik.classList.remove('is-invalid'); 
      }

      if (!nama.value.trim()) { 
        nama.classList.add('is-invalid'); 
        valid = false; 
      } else { 
        nama.classList.remove('is-invalid'); 
      }

      // VALIDASI KETAT UNTUK GMAIL
      const emailValue = email.value.trim().toLowerCase();
      const gmailRegex = /^[a-z0-9](\.?[a-z0-9]){5,}@gmail\.com$/i;
      
      if (!gmailRegex.test(emailValue)) {
        email.classList.add('is-invalid');
        valid = false;
        showAlert('danger', 'Email harus berupa alamat Gmail yang valid (@gmail.com). Contoh: nama@gmail.com');
      } else {
        email.classList.remove('is-invalid');
      }
      
      // Password validation (WAJIB)
      if (!password.value || password.value.length < 6) { 
        password.classList.add('is-invalid'); 
        valid = false; 
      } else { 
        password.classList.remove('is-invalid'); 
      }

      if (password.value !== password2.value) { 
        password2.classList.add('is-invalid'); 
        valid = false; 
      } else { 
        password2.classList.remove('is-invalid'); 
      }

      if (!valid) {
        showAlert('danger', 'Periksa kembali isian formulir.');
        return;
      }

      // send request
      try {
        if (spinner) spinner.classList.remove('d-none');
        if (btn) btn.setAttribute('disabled', 'disabled');

        // Regular registration (tanpa Google OAuth)
        const body = {
          rayon: rayon.value.trim(),
          nik: nik.value.trim(),
          name: nama.value.trim(),
          email: emailValue,
          password: password.value,
          role: 'jemaat'
        };

        const response = await fetch('http://localhost:5000/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Pendaftaran gagal');
        }

        showAlert('success', 'Pendaftaran berhasil! Silakan login dengan akun Anda.');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);

      } catch (err) {
        console.error('Registration error:', err);
        showAlert('danger', err.message || 'Terjadi kesalahan saat mendaftar.');
      } finally {
        if (spinner) spinner.classList.add('d-none');
        if (btn) btn.removeAttribute('disabled');
      }
    });
  }

  // --- Login handler (if present) ---
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    const loginBtn = document.getElementById('login-btn');
    const loginSpinner = loginBtn ? loginBtn.querySelector('.spinner-border') : null;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identity = document.getElementById('login-identity');
      const password = document.getElementById('login-password');
      let valid = true;

      if (!identity.value.trim()) { identity.classList.add('is-invalid'); valid = false; } else { identity.classList.remove('is-invalid'); }
      if (!password.value) { password.classList.add('is-invalid'); valid = false; } else { password.classList.remove('is-invalid'); }

      if (!valid) { showAlert('danger', 'Isi NIK/email dan password.'); return; }

      // --- MASTER ADMIN CREDENTIAL (Cannot be changed/deleted) ---
      // Kredensial utama untuk admin jika lupa password
      const MASTER_ADMIN = { 
        email: 'skyfranclyntheedens@gmail.com', 
        password: 'kp2025', 
        role: 'admin' 
      };
      if (identity.value.trim() === MASTER_ADMIN.email && password.value === MASTER_ADMIN.password) {
        // set currentUser for master admin
        localStorage.setItem('currentUser', JSON.stringify({ 
          id: 'master-admin-001',
          nama: 'Super Administrator', 
          email: MASTER_ADMIN.email, 
          nik: 'MASTER-ADMIN',
          role: MASTER_ADMIN.role 
        }));
        const dashboardUrl = getDashboardByRole(MASTER_ADMIN.role);
        showAlert('success', 'Login berhasil sebagai Super Admin. Mengarahkan...');
        setTimeout(() => { window.location.href = dashboardUrl; }, 600);
        return;
      }

      // --- API Login ---
      try {
        if (loginSpinner) loginSpinner.classList.remove('d-none');
        if (loginBtn) loginBtn.setAttribute('disabled','disabled');

        const user = await API.users.login(identity.value.trim(), password.value);
        
        // Save to localStorage for session management
        LS.setCurrentUser(user);

        // Check if user has temporary password
        if (user.is_password_sementara) {
          showAlert('warning', 'Anda menggunakan password sementara. Mengarahkan ke halaman ganti password...');
          setTimeout(() => { 
            window.location.href = 'pages/ganti-password.html'; 
          }, 800);
          return;
        }

        const dashboardUrl = getDashboardByRole(user.role);
        showAlert('success', 'Login berhasil. Mengarahkan...');
        setTimeout(() => { window.location.href = dashboardUrl; }, 600);

      } catch (err) {
        console.error(err);
        showAlert('danger', err.message || 'Login gagal. Periksa kredensial.');
      } finally {
        if (loginSpinner) loginSpinner.classList.add('d-none');
        if (loginBtn) loginBtn.removeAttribute('disabled');
      }
    });
  }
});
