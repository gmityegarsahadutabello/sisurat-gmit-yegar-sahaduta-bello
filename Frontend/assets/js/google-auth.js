// ========================================
// GOOGLE OAUTH CONFIGURATION
// ========================================
// 
// PENTING: Ganti CLIENT_ID dengan Client ID Anda sendiri!
// 
// Cara mendapatkan Client ID:
// 1. Buka https://console.cloud.google.com/
// 2. Buat project baru atau pilih existing
// 3. Enable Google+ API
// 4. Buat OAuth 2.0 Client ID (Web application)
// 5. Tambahkan Authorized JavaScript origins:
//    - http://localhost:5500
//    - http://127.0.0.1:5500
// 6. Copy Client ID yang didapat
// 
// Format Client ID:
// xxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
//
// ========================================

const GOOGLE_CONFIG = {
  // TODO: Ganti dengan Client ID Anda!
  // Contoh: '123456789-abc123def456.apps.googleusercontent.com'
  CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  
  // Jangan ubah konfigurasi di bawah ini
  SCOPES: ['email', 'profile'],
};

// ========================================
// INISIALISASI GOOGLE SIGN-IN
// ========================================

function initializeGoogleSignIn() {
  // Check if Google API is loaded
  if (typeof google === 'undefined') {
    console.error('❌ Google API not loaded. Please check your internet connection.');
    const statusEl = document.getElementById('google-login-status');
    if (statusEl) {
      statusEl.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i>Google Sign-In tidak tersedia</span>';
    }
    return;
  }

  // Validasi Client ID
  if (GOOGLE_CONFIG.CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
    console.error('❌ Google Client ID belum dikonfigurasi!');
    console.error('📝 Silakan edit file google-auth.js dan ganti CLIENT_ID dengan Client ID Anda.');
    const statusEl = document.getElementById('google-login-status');
    if (statusEl) {
      statusEl.innerHTML = '<span class="text-warning"><i class="bi bi-info-circle me-1"></i>Google Sign-In belum dikonfigurasi</span>';
    }
    return;
  }

  console.log('✅ Initializing Google Sign-In...');

  try {
    // Initialize Google Sign-In
    google.accounts.id.initialize({
      client_id: GOOGLE_CONFIG.CLIENT_ID,
      callback: handleGoogleSignIn,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // Render button di halaman login
    const loginButton = document.getElementById('g-signin-button');
    if (loginButton) {
      google.accounts.id.renderButton(loginButton, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: '100%',
      });
      console.log('✅ Google Sign-In button rendered (Login page)');
    }

    // Render button di halaman register
    const registerButton = document.getElementById('g-signin-button-register');
    if (registerButton) {
      google.accounts.id.renderButton(registerButton, {
        theme: 'outline',
        size: 'large',
        text: 'signup_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: '100%',
      });
      console.log('✅ Google Sign-In button rendered (Register page)');
    }

  } catch (error) {
    console.error('❌ Error initializing Google Sign-In:', error);
    const statusEl = document.getElementById('google-login-status') || document.getElementById('google-register-status');
    if (statusEl) {
      statusEl.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i>Gagal menginisialisasi Google Sign-In</span>';
    }
  }
}

// ========================================
// HANDLE GOOGLE SIGN-IN CALLBACK
// ========================================

async function handleGoogleSignIn(response) {
  const statusEl = document.getElementById('google-login-status') || document.getElementById('google-register-status');
  const alertArea = document.getElementById('alert-area');
  
  console.log('📥 Received Google Sign-In response');
  
  try {
    // Show loading status
    if (statusEl) {
      statusEl.innerHTML = '<span class="text-info"><i class="spinner-border spinner-border-sm me-1"></i>Memverifikasi akun Google...</span>';
    }

    console.log('📤 Sending credential to backend...');

    // Send credential to backend
    const result = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential: response.credential
      })
    });

    const data = await result.json();
    console.log('📨 Backend response:', data);

    if (!result.ok) {
      throw new Error(data.message || 'Gagal memverifikasi akun Google');
    }

    // Check action from backend
    if (data.action === 'login') {
      // User sudah terdaftar, login langsung
      console.log('✅ User found, logging in...');
      const user = data.user;
      
      // Save to localStorage
      localStorage.setItem('currentUser', JSON.stringify(user));
      console.log('💾 User data saved to localStorage');
      
      // Show success message
      if (alertArea) {
        alertArea.innerHTML = `<div class="alert alert-success alert-sm" role="alert">
          <i class="bi bi-check-circle me-2"></i>Login berhasil! Mengarahkan ke dashboard...
        </div>`;
      }
      
      // Redirect to dashboard based on role
      const dashboardUrl = getDashboardByRole(user.role);
      console.log('🔀 Redirecting to:', dashboardUrl);
      
      setTimeout(() => {
        window.location.href = dashboardUrl;
      }, 800);
      
    } else if (data.action === 'register') {
      // User belum terdaftar, redirect ke halaman register dengan data Google
      console.log('ℹ️ User not found, redirecting to registration...');
      
      // Store Google data temporarily
      sessionStorage.setItem('googleData', JSON.stringify(data.googleData));
      console.log('💾 Google data saved to sessionStorage');
      
      if (alertArea) {
        alertArea.innerHTML = `<div class="alert alert-info alert-sm" role="alert">
          <i class="bi bi-info-circle me-2"></i>Akun Google Anda belum terdaftar. Mengarahkan ke halaman registrasi...
        </div>`;
      }
      
      setTimeout(() => {
        window.location.href = 'register.html';
      }, 1000);
    }

  } catch (error) {
    console.error('❌ Google Sign-In Error:', error);
    
    if (statusEl) {
      statusEl.innerHTML = '';
    }
    
    if (alertArea) {
      alertArea.innerHTML = `<div class="alert alert-danger alert-sm" role="alert">
        <i class="bi bi-x-circle me-2"></i>${error.message || 'Gagal login dengan Google'}
      </div>`;
    }
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

// Get dashboard URL based on user role
function getDashboardByRole(role) {
  const dashboardMap = {
    'jemaat': 'dashboard.html',
    'koordinator': 'pages/koordinator/dashboard.html',
    'tatausaha': 'pages/tatausaha/dashboard-tatausaha.html',
    'sekretaris': 'pages/sekretaris/dashboard-sekretaris.html',
    'pendeta': 'pages/pendeta/dashboard-pendeta.html',
    'admin': 'pages/admin/dashboard-admin.html'
  };
  
  return dashboardMap[role] || 'dashboard.html';
}

// ========================================
// AUTO-INITIALIZE ON PAGE LOAD
// ========================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing Google Sign-In...');
    initializeGoogleSignIn();
  });
} else {
  // DOMContentLoaded already fired
  console.log('🚀 DOM already loaded, initializing Google Sign-In...');
  initializeGoogleSignIn();
}

// ========================================
// DEBUGGING HELPERS
// ========================================

// Log configuration (tanpa expose Client ID penuh)
console.log('⚙️ Google OAuth Config:', {
  clientIdConfigured: GOOGLE_CONFIG.CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  clientIdPrefix: GOOGLE_CONFIG.CLIENT_ID.substring(0, 20) + '...',
});

// Export untuk debugging (optional)
window.GOOGLE_AUTH_DEBUG = {
  config: GOOGLE_CONFIG,
  reinitialize: initializeGoogleSignIn,
};

