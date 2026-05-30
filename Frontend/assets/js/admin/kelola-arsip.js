// Admin - Kelola Arsip Surat
(function() {
  const qs = id => document.getElementById(id);
  
  let allArchives = [];
  let selectedIds = new Set();
  let storageStats = null;
  let deleteAction = null; // Store the delete action to be executed after password confirmation

  // Password confirmation modal
  let passwordModal = null;
  let logoutModal = null;

  // Initialize password modal
  function initPasswordModal() {
    const modalElement = document.getElementById('passwordConfirmModal');
    if (modalElement) {
      passwordModal = new bootstrap.Modal(modalElement);
      
      // Handle confirm button
      qs('confirm-delete-btn')?.addEventListener('click', confirmDeleteWithPassword);
      
      // Clear password on modal hide
      modalElement.addEventListener('hidden.bs.modal', () => {
        qs('admin-password-input').value = '';
        qs('password-error').classList.add('d-none');
        deleteAction = null;
      });
      
      // Allow Enter key to submit
      qs('admin-password-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          confirmDeleteWithPassword();
        }
      });
    }
  }

  // Initialize logout modal
  function initLogoutModal() {
    const modalElement = document.getElementById('logoutConfirmModal');
    if (modalElement) {
      const overlay = modalElement.querySelector('.confirm-modal-overlay');
      const closeBtn = document.getElementById('closeLogoutModal');
      const cancelBtn = document.getElementById('cancelLogoutBtn');
      const confirmBtn = document.getElementById('confirmLogoutBtn');
      
      // Function to show modal
      const showModal = () => {
        modalElement.classList.add('show');
        document.body.style.overflow = 'hidden';
      };
      
      // Function to hide modal
      const hideModal = () => {
        modalElement.classList.remove('show');
        document.body.style.overflow = '';
      };
      
      // Store functions for external access
      logoutModal = {
        show: showModal,
        hide: hideModal
      };
      
      // Close button
      closeBtn?.addEventListener('click', hideModal);
      
      // Cancel button
      cancelBtn?.addEventListener('click', hideModal);
      
      // Overlay click to close
      overlay?.addEventListener('click', hideModal);
      
      // Prevent modal content click from closing
      modalElement.querySelector('.confirm-modal-content')?.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      // Confirm logout button - use global logout function
      confirmBtn?.addEventListener('click', () => {
        hideModal();
        
        // Call global logout function from navbar-admin.js
        if (typeof window.performAdminLogout === 'function') {
          window.performAdminLogout();
        } else {
          // Fallback if global function not available
          if (window.LS && typeof window.LS.logout === 'function') {
            window.LS.logout();
          } else {
            localStorage.removeItem('currentUser');
            window.location.href = '../../index.html';
          }
        }
      });
      
      // ESC key to close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalElement.classList.contains('show')) {
          hideModal();
        }
      });
    }
  }

  // Verify admin password
  async function verifyAdminPassword(password) {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const email = currentUser.email;
      
      if (!email) {
        throw new Error('User tidak ditemukan. Silakan login kembali.');
      }

      // Try to login with the provided password to verify
      const user = await window.API.users.login(email, password);

      // Check if user is admin (API returns user data directly, not nested in 'user' property)
      return user.role === 'admin';
    } catch (error) {
      console.error('❌ Error verifying password:', error);
      return false;
    }
  }

  // Confirm delete with password
  async function confirmDeleteWithPassword() {
    const password = qs('admin-password-input').value;
    const errorDiv = qs('password-error');
    const errorText = qs('password-error-text');
    const confirmBtn = qs('confirm-delete-btn');
    
    // Validate input
    if (!password) {
      errorText.textContent = 'Password tidak boleh kosong';
      errorDiv.classList.remove('d-none');
      return;
    }

    // Disable button and show loading
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memverifikasi...';

    // Verify password
    const isValid = await verifyAdminPassword(password);

    if (!isValid) {
      errorText.textContent = 'Password salah atau Anda bukan admin';
      errorDiv.classList.remove('d-none');
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="bi bi-trash-fill me-1"></i>Hapus Arsip';
      return;
    }

    // Password valid, execute delete action
    errorDiv.classList.add('d-none');
    passwordModal.hide();
    
    // Execute the stored delete action
    if (deleteAction) {
      await deleteAction();
    }

    // Reset button
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="bi bi-trash-fill me-1"></i>Hapus Arsip';
  }

  // Show password confirmation modal
  function showPasswordConfirmModal(action, infoHTML) {
    deleteAction = action;
    qs('delete-info').innerHTML = infoHTML;
    qs('admin-password-input').value = '';
    qs('password-error').classList.add('d-none');
    passwordModal.show();
    
    // Focus on password input after modal is shown
    setTimeout(() => {
      qs('admin-password-input')?.focus();
    }, 500);
  }

  // Escape HTML
  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Format date
  function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get surat type label
  function getSuratTypeLabel(type) {
    const types = {
      'baptis': 'Baptis',
      'sidi': 'Sidi',
      'menikah': 'Menikah',
      'pindah_masuk': 'Pindah Masuk',
      'pindah_keluar': 'Pindah Keluar',
      'lainnya': 'Lainnya'
    };
    return types[type] || type;
  }

  // Load storage statistics
  async function loadStorageStats() {
    try {
      const data = await window.API.request('/pengajuan/stats/storage');
      storageStats = data;
      renderStorageStats();
    } catch (error) {
      console.error('❌ Error loading storage stats:', error);
      showToast('danger', 'Gagal memuat statistik penyimpanan');
    }
  }

  // Render storage statistics
  function renderStorageStats() {
    if (!storageStats) return;

    const { storage, pengajuan } = storageStats;
    
    // Update storage display with formatting
    qs('storage-used').textContent = `${storage.usedMB} MB`;
    qs('storage-available').textContent = `${storage.availableMB} MB`;
    qs('storage-limit').textContent = `${storage.limitMB} MB`;
    qs('storage-percent').textContent = `${storage.percent}%`;
    
    // Update counts
    qs('archive-total').textContent = pengajuan.total;
    qs('archive-count').textContent = pengajuan.archived;
    qs('active-count').textContent = pengajuan.active;
    
    // Update last updated timestamp
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    qs('last-updated').innerHTML = `<i class="bi bi-arrow-clockwise me-1"></i>Terakhir diperbarui: ${timeStr}`;
    
    // Update progress bar
    const progressBar = qs('storage-progress');
    const percent = storage.percent;
    progressBar.style.width = `${percent}%`;
    progressBar.textContent = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', percent);
    
    // Set color and status based on usage
    progressBar.className = 'progress-bar';
    const statusText = qs('storage-status-text');
    
    if (percent >= 90) {
      progressBar.classList.add('bg-danger');
      statusText.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i>Kritis! Storage hampir penuh';
      statusText.className = 'fw-semibold opacity-75 text-danger';
    } else if (percent >= 70) {
      progressBar.classList.add('bg-warning');
      statusText.innerHTML = '<i class="bi bi-exclamation-circle-fill me-1"></i>Peringatan: Storage > 70%';
      statusText.className = 'fw-semibold opacity-75 text-warning';
    } else if (percent >= 50) {
      progressBar.classList.add('bg-info');
      statusText.innerHTML = '<i class="bi bi-info-circle-fill me-1"></i>Cukup: Storage > 50%';
      statusText.className = 'fw-semibold opacity-75 text-info';
    } else {
      progressBar.classList.add('bg-success');
      statusText.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Optimal: Storage aman';
      statusText.className = 'fw-semibold opacity-75 text-success';
    }
    
    // Show recommendation if storage is high
    if (percent >= 70) {
      console.warn(`⚠️ Storage usage at ${percent}%. Consider deleting old archives.`);
    }
  }

  // Load archived pengajuan
  async function loadArchives() {
    try {
      // Fetch all pengajuan and filter for archived statuses on client side
      // This handles both 'arsip' status and legacy 'validated_by_pendeta' status
      const data = await window.API.request('/pengajuan');

      console.log('📦 Total pengajuan loaded:', data.length);
      
      // Filter for archived statuses
      // Include: 'arsip', 'validated_by_pendeta', and any with archived_at date
      allArchives = data.filter(item => {
        if (!item) return false;
        const status = String(item.status || '').toLowerCase();
        const hasArchivedDate = item.archived_at || item.validated_at;
        
        return status === 'arsip' || 
               status === 'validated_by_pendeta' || 
               status === 'validated' ||
               hasArchivedDate;
      });
      
      console.log('📦 Filtered archives:', allArchives.length);
      console.log('📦 Archive statuses:', allArchives.map(a => a.status));
      
      renderArchives(allArchives);
      
      // Reload storage stats
      await loadStorageStats();
    } catch (error) {
      console.error('❌ Error loading archives:', error);
      const tbody = qs('archives-tbody');
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-5 text-danger">
            <i class="bi bi-exclamation-triangle fs-1"></i>
            <p class="mt-2">Gagal memuat data arsip: ${escapeHtml(error.message)}</p>
          </td>
        </tr>
      `;
    }
  }

  // Render archives table
  function renderArchives(archives) {
    const tbody = qs('archives-tbody');
    
    if (!archives || archives.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <i class="bi bi-inbox"></i>
              <h5 class="mt-3">Tidak Ada Arsip</h5>
              <p class="text-muted">Belum ada surat yang diarsipkan</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';
    
    archives.forEach((archive, index) => {
      const tr = document.createElement('tr');
      tr.className = 'archive-item';
      tr.dataset.id = archive._id || archive.id;
      
      const isSelected = selectedIds.has(archive._id || archive.id);
      if (isSelected) {
        tr.classList.add('selected');
      }
      
      tr.innerHTML = `
        <td data-label="" class="text-center">
          <input type="checkbox" class="form-check-input archive-checkbox" 
                 data-id="${escapeHtml(archive._id || archive.id)}" 
                 ${isSelected ? 'checked' : ''}>
        </td>
        <td data-label="No" class="fw-bold text-muted">${index + 1}</td>
        <td data-label="Pengguna">
          <div class="fw-semibold">${escapeHtml(archive.user_nama || '-')}</div>
          <small class="text-muted">${escapeHtml(archive.user_email || '-')}</small>
        </td>
        <td data-label="Jenis Surat">
          <span class="badge bg-secondary">${getSuratTypeLabel(archive.type)}</span>
        </td>
        <td data-label="Nomor Surat" class="font-monospace">${escapeHtml(archive.nomor || '-')}</td>
        <td data-label="Rayon">${escapeHtml(archive.rayon || '-')}</td>
        <td data-label="Diarsipkan" class="text-muted">
          <small>${formatDate(archive.archived_at)}</small>
        </td>
        <td data-label="Aksi" class="text-center">
          <button class="btn btn-sm btn-outline-danger btn-delete-single" 
                  data-id="${escapeHtml(archive._id || archive.id)}"
                  data-name="${escapeHtml(archive.user_nama || 'Surat')}"
                  title="Hapus">
            <i class="bi bi-trash"></i><span class="d-md-none ms-2">Hapus</span>
          </button>
        </td>
      `;
      
      tbody.appendChild(tr);
    });

    // Attach event listeners to checkboxes
    tbody.querySelectorAll('.archive-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', handleCheckboxChange);
    });

    // Attach event listeners to delete buttons
    tbody.querySelectorAll('.btn-delete-single').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        deleteSingleArchive(id, name);
      });
    });

    updateSelectedCount();
  }

  // Handle checkbox change
  function handleCheckboxChange(e) {
    const id = e.target.dataset.id;
    const row = e.target.closest('tr');
    
    if (e.target.checked) {
      selectedIds.add(id);
      row.classList.add('selected');
    } else {
      selectedIds.delete(id);
      row.classList.remove('selected');
    }
    
    updateSelectedCount();
  }

  // Update selected count
  function updateSelectedCount() {
    const count = selectedIds.size;
    qs('selected-count').textContent = count;
    qs('btn-delete-selected').disabled = count === 0;
    
    // Update header checkbox
    const headerCheckbox = qs('checkbox-header');
    if (count === 0) {
      headerCheckbox.checked = false;
      headerCheckbox.indeterminate = false;
    } else if (count === allArchives.length) {
      headerCheckbox.checked = true;
      headerCheckbox.indeterminate = false;
    } else {
      headerCheckbox.checked = false;
      headerCheckbox.indeterminate = true;
    }
  }

  // Select all archives
  function selectAll() {
    selectedIds.clear();
    allArchives.forEach(archive => {
      selectedIds.add(archive._id || archive.id);
    });
    
    document.querySelectorAll('.archive-checkbox').forEach(checkbox => {
      checkbox.checked = true;
      checkbox.closest('tr').classList.add('selected');
    });
    
    updateSelectedCount();
  }

  // Deselect all archives
  function deselectAll() {
    selectedIds.clear();
    
    document.querySelectorAll('.archive-checkbox').forEach(checkbox => {
      checkbox.checked = false;
      checkbox.closest('tr').classList.remove('selected');
    });
    
    updateSelectedCount();
  }

  // Delete single archive
  async function deleteSingleArchive(id, name) {
    const infoHTML = `
      <div class="d-flex align-items-start gap-2">
        <i class="bi bi-file-earmark-x-fill text-danger fs-4"></i>
        <div>
          <p class="mb-1"><strong>Anda akan menghapus arsip:</strong></p>
          <p class="mb-1 text-primary fw-bold">${escapeHtml(name)}</p>
          <p class="mb-0 text-muted small">Data yang dihapus tidak dapat dikembalikan.</p>
        </div>
      </div>
    `;

    const deleteFunc = async () => {
      try {
        const data = await window.API.request('/pengajuan/archives', 'DELETE', {
          ids: [id]
        });

        showToast('success', data.message || 'Arsip berhasil dihapus');
        selectedIds.delete(id);
        await loadArchives();
      } catch (error) {
        console.error('❌ Error deleting archive:', error);
        showToast('danger', `Gagal menghapus arsip: ${error.message}`);
      }
    };

    showPasswordConfirmModal(deleteFunc, infoHTML);
  }

  // Delete selected archives
  async function deleteSelected() {
    if (selectedIds.size === 0) return;

    const infoHTML = `
      <div class="d-flex align-items-start gap-2">
        <i class="bi bi-files text-warning fs-4"></i>
        <div>
          <p class="mb-1"><strong>Anda akan menghapus arsip terpilih:</strong></p>
          <p class="mb-1">
            <span class="badge bg-warning text-dark fs-6">${selectedIds.size} Arsip</span>
          </p>
          <p class="mb-0 text-muted small">Semua data arsip yang dipilih akan dihapus permanen.</p>
        </div>
      </div>
    `;

    const deleteFunc = async () => {
      try {
        const data = await window.API.request('/pengajuan/archives', 'DELETE', {
          ids: Array.from(selectedIds)
        });

        showToast('success', data.message || 'Arsip berhasil dihapus');
        selectedIds.clear();
        await loadArchives();
      } catch (error) {
        console.error('❌ Error deleting selected archives:', error);
        showToast('danger', `Gagal menghapus arsip: ${error.message}`);
      }
    };

    showPasswordConfirmModal(deleteFunc, infoHTML);
  }

  // Delete all archives
  async function deleteAll() {
    if (allArchives.length === 0) {
      alert('Tidak ada arsip yang dapat dihapus');
      return;
    }

    const infoHTML = `
      <div class="d-flex align-items-start gap-2">
        <i class="bi bi-trash3-fill text-danger fs-3"></i>
        <div>
          <p class="mb-2"><strong class="text-danger fs-5">⚠️ PERINGATAN PENTING!</strong></p>
          <p class="mb-1"><strong>Anda akan menghapus SEMUA arsip:</strong></p>
          <p class="mb-2">
            <span class="badge bg-danger fs-6">${allArchives.length} Arsip Surat</span>
          </p>
          <div class="alert alert-danger mb-0 py-2">
            <i class="bi bi-exclamation-octagon-fill me-1"></i>
            <strong>Ini adalah tindakan permanen!</strong><br>
            <small>Semua data arsip akan dihapus dari database dan tidak dapat dikembalikan.</small>
          </div>
        </div>
      </div>
    `;

    // First confirmation
    if (!confirm(`⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA ${allArchives.length} arsip surat.\n\nData yang sudah dihapus tidak dapat dikembalikan.\n\nLanjutkan ke konfirmasi password?`)) {
      return;
    }

    const deleteFunc = async () => {
      try {
        const data = await window.API.request('/pengajuan/archives', 'DELETE', {
          deleteAll: true
        });

        showToast('success', data.message || 'Semua arsip berhasil dihapus');
        selectedIds.clear();
        await loadArchives();
      } catch (error) {
        console.error('❌ Error deleting all archives:', error);
        showToast('danger', `Gagal menghapus arsip: ${error.message}`);
      }
    };

    showPasswordConfirmModal(deleteFunc, infoHTML);
  }

  // Search archives
  function searchArchives(query) {
    query = query.toLowerCase().trim();
    
    if (!query) {
      renderArchives(allArchives);
      return;
    }

    const filtered = allArchives.filter(archive => {
      const searchText = JSON.stringify(archive).toLowerCase();
      return searchText.includes(query);
    });

    renderArchives(filtered);
  }

  // Show toast notification
  function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
    toast.style.cssText = 'z-index: 9999; min-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    toast.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'}"></i>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Initialize page
  document.addEventListener('DOMContentLoaded', () => {
    // Check admin access
    const currentUser = LS.getCurrentUser ? LS.getCurrentUser() : JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser || currentUser.role !== 'admin') {
      alert('Akses ditolak. Hanya admin yang dapat mengakses halaman ini.');
      window.location.href = '../../index.html';
      return;
    }

    // Initialize modals
    initPasswordModal();
    initLogoutModal();

    // Load initial data
    loadArchives();

    // Event listeners
    qs('btn-select-all')?.addEventListener('click', selectAll);
    qs('btn-deselect-all')?.addEventListener('click', deselectAll);
    qs('btn-delete-selected')?.addEventListener('click', deleteSelected);
    qs('btn-delete-all')?.addEventListener('click', deleteAll);
    qs('btn-refresh')?.addEventListener('click', loadArchives);
    
    // Header checkbox
    qs('checkbox-header')?.addEventListener('change', (e) => {
      if (e.target.checked) {
        selectAll();
      } else {
        deselectAll();
      }
    });

    // Search input
    qs('search-archive')?.addEventListener('input', (e) => {
      searchArchives(e.target.value);
    });
    
    // Note: Logout button is handled by navbar-admin.js
  });
})();
