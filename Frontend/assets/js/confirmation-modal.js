/**
 * Global Confirmation Modal Helper
 * Usage: ConfirmModal.show({ options })
 */

const ConfirmModal = (function() {
  let modalElement = null;
  let currentCallback = null;
  let currentCancelCallback = null;
  let eventsWired = false;
  
  // Initialize modal (load component if not exists)
  async function init() {
    if (modalElement) return true;
    
    // Check if modal already exists in DOM
    modalElement = document.getElementById('confirmModal');
    
    if (!modalElement) {
      // Try to load modal component from common paths
      const candidates = [
        'assets/components/confirmation-modal.html',
        '../../assets/components/confirmation-modal.html',
        '../assets/components/confirmation-modal.html'
      ];
      for (const url of candidates) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const html = await response.text();
            const div = document.createElement('div');
            div.innerHTML = html;
            document.body.appendChild(div.firstElementChild);
            modalElement = document.getElementById('confirmModal');
            break;
          }
        } catch (e) { /* continue */ }
      }
      // Inline fallback if file not found
      if (!modalElement) {
        const fallback = document.createElement('div');
        fallback.innerHTML = `
          <div id="confirmModal" class="confirm-modal">
            <div class="confirm-modal-overlay"></div>
            <div class="confirm-modal-dialog">
              <div class="confirm-modal-header primary">
                <div id="confirmIcon" class="confirm-icon"><i class="bi bi-question-circle-fill"></i></div>
                <div id="confirmTitle" class="confirm-title">Konfirmasi Aksi</div>
                <button id="confirmClose" class="confirm-close" type="button" aria-label="Close">&times;</button>
              </div>
              <div class="confirm-modal-body">
                <div id="confirmMessage" class="confirm-message">Apakah Anda yakin?</div>
                <div id="confirmSubMessage" class="confirm-submessage" style="display:none;"></div>
                <div id="confirmDetail" class="confirm-detail" style="display:none;"></div>
                <div id="confirmInputSection" class="confirm-input-section" style="display:none;" data-required="false" data-min-length="0">
                  <label id="confirmInputLabel" class="confirm-input-label">Catatan</label>
                  <textarea id="confirmInput" class="confirm-input" rows="3" placeholder=""></textarea>
                  <div id="confirmInputHint" class="confirm-input-hint"></div>
                </div>
                <div id="confirmWarning" class="confirm-warning" style="display:none;">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <span id="confirmWarningText">Tindakan ini tidak dapat dibatalkan.</span>
                </div>
              </div>
              <div class="confirm-modal-footer">
                <button id="confirmCancel" class="confirm-btn-cancel" type="button"><span>Batal</span></button>
                <button id="confirmConfirm" class="confirm-btn-confirm primary" type="button"><span id="confirmBtnText">Konfirmasi</span></button>
              </div>
            </div>
          </div>`;
        document.body.appendChild(fallback.firstElementChild);
        modalElement = document.getElementById('confirmModal');
      }
    }
    
    if (!modalElement) {
      console.error('Confirmation modal not found');
      return false;
    }
    
    // Wire up event listeners only once
    if (!eventsWired) {
      wireEvents();
      eventsWired = true;
    }
    return true;
  }
  
  function wireEvents() {
    const closeBtn = document.getElementById('confirmClose');
    const cancelBtn = document.getElementById('confirmCancel');
    const confirmBtn = document.getElementById('confirmConfirm');
    const overlay = modalElement.querySelector('.confirm-modal-overlay');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', handleCancel);
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', handleCancel);
    }
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', handleConfirm);
    }
    
    if (overlay) {
      overlay.addEventListener('click', handleCancel);
    }
  }
  
  function handleCancel() {
    hide();
    if (currentCancelCallback) {
      currentCancelCallback();
    }
  }
  
  function handleConfirm() {
    const confirmBtn = document.getElementById('confirmConfirm');
    if (confirmBtn && confirmBtn.disabled) return;
    
    const inputSection = document.getElementById('confirmInputSection');
    const input = document.getElementById('confirmInput');
    
    // Validate input if required
    if (inputSection && inputSection.style.display !== 'none') {
      const isRequired = inputSection.dataset.required === 'true';
      const minLength = parseInt(inputSection.dataset.minLength || '0');
      const value = (input.value || '').trim();
      
      if (isRequired && !value) {
        showInputError('Field ini wajib diisi');
        return;
      }
      
      if (minLength > 0 && value.length < minLength) {
        showInputError(`Minimal ${minLength} karakter`);
        return;
      }
      
      if (currentCallback) {
        currentCallback(value);
      }
    } else {
      if (currentCallback) {
        currentCallback();
      }
    }
    
    hide();
  }
  
  function showInputError(message) {
    const input = document.getElementById('confirmInput');
    const hint = document.getElementById('confirmInputHint');
    
    if (input) {
      input.classList.add('error');
      input.focus();
    }
    
    if (hint) {
      hint.classList.add('error');
      hint.textContent = message;
    }
    
    // Clear error after input
    if (input) {
      input.addEventListener('input', function clearError() {
        input.classList.remove('error');
        if (hint) {
          hint.classList.remove('error');
          const minLength = parseInt(document.getElementById('confirmInputSection')?.dataset.minLength || '0');
          hint.textContent = minLength > 0 ? `Minimal ${minLength} karakter` : '';
        }
        input.removeEventListener('input', clearError);
      });
    }
  }
  
  /**
   * Show confirmation modal
   * @param {Object} options - Configuration options
   * @param {string} options.type - Modal type: 'primary', 'success', 'danger', 'warning', 'info'
   * @param {string} options.title - Modal title
   * @param {string} options.message - Primary message
   * @param {string} options.subMessage - Secondary message (optional)
   * @param {Object} options.detail - Detail object to display (optional)
   * @param {boolean} options.showInput - Show input textarea (optional)
   * @param {string} options.inputLabel - Input label (optional)
   * @param {boolean} options.inputRequired - Is input required (optional)
   * @param {number} options.inputMinLength - Minimum input length (optional)
   * @param {string} options.inputPlaceholder - Input placeholder (optional)
   * @param {boolean} options.showWarning - Show warning note (optional)
   * @param {string} options.warningText - Warning text (optional)
   * @param {string} options.confirmText - Confirm button text (optional)
   * @param {string} options.cancelText - Cancel button text (optional)
   * @param {Function} options.onConfirm - Callback when confirmed
   * @param {Function} options.onCancel - Callback when cancelled (optional)
   */
  async function show(options = {}) {
    const initialized = await init();
    if (!initialized) {
      console.error('Modal not initialized');
      return;
    }
    
    const {
      type = 'primary',
      icon = null,
      title = 'Konfirmasi Aksi',
      message = 'Apakah Anda yakin ingin melanjutkan?',
      subMessage = 'Pastikan semua data sudah benar.',
      detail = null,
      showInput = false,
      inputLabel = 'Catatan',
      inputRequired = false,
      inputMinLength = 0,
      inputPlaceholder = 'Masukkan catatan atau alasan...',
      showWarning = false,
      warningText = 'Tindakan ini tidak dapat dibatalkan.',
      confirmText = 'Konfirmasi',
      cancelText = 'Batal',
      onConfirm = null,
      onCancel = null
    } = options;
    
    // Set callbacks
    currentCallback = onConfirm;
    currentCancelCallback = onCancel;
    
    // Update header style
    const header = modalElement.querySelector('.confirm-modal-header');
    header.className = `confirm-modal-header ${type}`;
    
    // Update icon
    const iconEl = document.getElementById('confirmIcon');
    if (iconEl) {
      const iconMap = {
        primary: 'bi-question-circle-fill',
        success: 'bi-check-circle-fill',
        danger: 'bi-exclamation-triangle-fill',
        warning: 'bi-exclamation-circle-fill',
        info: 'bi-info-circle-fill'
      };
      iconEl.innerHTML = `<i class="bi ${icon || iconMap[type]}"></i>`;
    }
    
    // Update title
    const titleEl = document.getElementById('confirmTitle');
    if (titleEl) titleEl.textContent = title;
    
    // Update messages
    const messageEl = document.getElementById('confirmMessage');
    if (messageEl) messageEl.innerHTML = message;
    
    const subMessageEl = document.getElementById('confirmSubMessage');
    if (subMessageEl) {
      if (subMessage) {
        subMessageEl.textContent = subMessage;
        subMessageEl.style.display = 'block';
      } else {
        subMessageEl.style.display = 'none';
      }
    }
    
    // Update detail section
    const detailEl = document.getElementById('confirmDetail');
    if (detailEl) {
      if (detail && Object.keys(detail).length > 0) {
        let detailHTML = '<div class="confirm-detail-header"><i class="bi bi-info-circle"></i> Detail Informasi</div>';
        detailHTML += '<div class="confirm-detail-content">';
        
        Object.entries(detail).forEach(([key, value]) => {
          detailHTML += `
            <div class="confirm-detail-item">
              <span class="confirm-detail-label">${escapeHtml(key)}</span>
              <span class="confirm-detail-value">${escapeHtml(String(value))}</span>
            </div>
          `;
        });
        
        detailHTML += '</div>';
        detailEl.innerHTML = detailHTML;
        detailEl.style.display = 'block';
      } else {
        detailEl.style.display = 'none';
      }
    }
    
    // Update input section
    const inputSection = document.getElementById('confirmInputSection');
    const input = document.getElementById('confirmInput');
    const inputLabelEl = document.getElementById('confirmInputLabel');
    const inputHint = document.getElementById('confirmInputHint');
    
    if (inputSection) {
      if (showInput) {
        inputSection.style.display = 'block';
        inputSection.dataset.required = inputRequired;
        inputSection.dataset.minLength = inputMinLength;
        
        if (inputLabelEl) {
          inputLabelEl.textContent = inputLabel;
          inputLabelEl.className = `confirm-input-label ${inputRequired ? 'required' : ''}`;
        }
        
        if (input) {
          input.value = '';
          input.placeholder = inputPlaceholder;
          input.classList.remove('error');
        }
        
        if (inputHint) {
          inputHint.classList.remove('error');
          inputHint.textContent = inputMinLength > 0 ? `Minimal ${inputMinLength} karakter` : '';
        }
      } else {
        inputSection.style.display = 'none';
      }
    }
    
    // Update warning section
    const warningEl = document.getElementById('confirmWarning');
    const warningTextEl = document.getElementById('confirmWarningText');
    
    if (warningEl) {
      if (showWarning) {
        warningEl.className = `confirm-warning ${type === 'danger' ? 'danger' : ''}`;
        if (warningTextEl) warningTextEl.textContent = warningText;
        warningEl.style.display = 'flex';
      } else {
        warningEl.style.display = 'none';
      }
    }
    
    // Update buttons
    const confirmBtn = document.getElementById('confirmConfirm');
    const confirmBtnText = document.getElementById('confirmBtnText');
    const cancelBtn = document.getElementById('confirmCancel');
    
    if (confirmBtn) {
      confirmBtn.className = `confirm-btn-confirm ${type}`;
      confirmBtn.disabled = false;
      confirmBtn.classList.remove('loading');
    }
    
    if (confirmBtnText) {
      confirmBtnText.textContent = confirmText;
    }
    
    if (cancelBtn && cancelBtn.querySelector('span')) {
      cancelBtn.querySelector('span').textContent = cancelText;
    }
    
    // Show modal
    modalElement.classList.add('show');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    
    // Focus input if shown
    if (showInput && input) {
      setTimeout(() => input.focus(), 100);
    }
  }
  
  function hide() {
    if (!modalElement) return;
    modalElement.classList.remove('show');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    currentCallback = null;
    currentCancelCallback = null;
  }
  
  function setLoading(loading = true) {
    const confirmBtn = document.getElementById('confirmConfirm');
    const cancelBtn = document.getElementById('confirmCancel');
    const closeBtn = document.getElementById('confirmClose');
    
    if (confirmBtn) {
      if (loading) {
        confirmBtn.classList.add('loading');
        confirmBtn.disabled = true;
      } else {
        confirmBtn.classList.remove('loading');
        confirmBtn.disabled = false;
      }
    }
    
    if (cancelBtn) cancelBtn.disabled = loading;
    if (closeBtn) closeBtn.disabled = loading;
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Public API
  return {
    show,
    hide,
    setLoading
  };
})();

// Make it globally available
window.ConfirmModal = ConfirmModal;
