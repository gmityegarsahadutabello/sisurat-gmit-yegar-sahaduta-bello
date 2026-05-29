// Enhanced Interactivity for Accounts Management
(function() {
  'use strict';

  // Add loading state to buttons
  window.addLoadingState = function(button, loading = true) {
    if (!button) return;
    
    if (loading) {
      button.dataset.originalText = button.innerHTML;
      button.classList.add('loading');
      button.disabled = true;
    } else {
      button.classList.remove('loading');
      button.disabled = false;
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
      }
    }
  };

  // Form validation with visual feedback
  window.validateFormField = function(field, validationFn, errorMessage) {
    if (!field) return false;
    
    const value = field.value.trim();
    const isValid = validationFn(value);
    
    if (!isValid && value) {
      field.classList.add('is-invalid');
      field.classList.remove('is-valid');
      
      // Add or update error message
      let feedback = field.parentElement.querySelector('.invalid-feedback');
      if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        field.parentElement.appendChild(feedback);
      }
      feedback.innerHTML = `<i class="bi bi-exclamation-circle"></i> ${errorMessage}`;
      feedback.style.display = 'flex';
    } else if (value) {
      field.classList.remove('is-invalid');
      field.classList.add('is-valid');
      
      const feedback = field.parentElement.querySelector('.invalid-feedback');
      if (feedback) feedback.style.display = 'none';
    } else {
      field.classList.remove('is-invalid', 'is-valid');
      const feedback = field.parentElement.querySelector('.invalid-feedback');
      if (feedback) feedback.style.display = 'none';
    }
    
    return isValid || !value;
  };

  // Email validation
  window.validateEmail = function(email) {
    const regex = /^[a-z0-9](\.?[a-z0-9]){5,}@gmail\.com$/i;
    return regex.test(email);
  };

  // NIK validation (16 digits)
  window.validateNIK = function(nik) {
    const regex = /^\d{16}$/;
    return regex.test(nik);
  };

  // Password strength indicator
  window.checkPasswordStrength = function(password) {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    const levels = [
      { strength: 0, label: 'Sangat Lemah', color: '#dc3545' },
      { strength: 1, label: 'Lemah', color: '#fd7e14' },
      { strength: 2, label: 'Cukup', color: '#ffc107' },
      { strength: 3, label: 'Kuat', color: '#28a745' },
      { strength: 4, label: 'Sangat Kuat', color: '#10b981' }
    ];
    
    return levels[Math.min(strength, 4)];
  };

  // Show password strength indicator
  window.showPasswordStrength = function(passwordField, indicatorId) {
    if (!passwordField) return;
    
    let indicator = document.getElementById(indicatorId);
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = indicatorId;
      indicator.className = 'password-strength-indicator mt-2';
      indicator.style.cssText = 'height: 4px; border-radius: 2px; transition: all 0.3s ease; background: #e9ecef;';
      passwordField.parentElement.appendChild(indicator);
    }
    
    passwordField.addEventListener('input', function() {
      const strength = window.checkPasswordStrength(this.value);
      indicator.style.width = (strength.strength * 25) + '%';
      indicator.style.background = strength.color;
      
      let label = indicator.nextElementSibling;
      if (!label || !label.classList.contains('password-strength-label')) {
        label = document.createElement('small');
        label.className = 'password-strength-label text-muted d-block mt-1';
        indicator.parentElement.appendChild(label);
      }
      
      if (strength.strength > 0) {
        label.textContent = 'Kekuatan: ' + strength.label;
        label.style.color = strength.color;
      } else {
        label.textContent = '';
      }
    });
  };

  // Animate form sections on focus
  window.animateFormSections = function() {
    const formSections = document.querySelectorAll('.form-section');
    
    formSections.forEach((section, index) => {
      // Add entrance animation
      section.style.opacity = '0';
      section.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        section.style.transition = 'all 0.4s ease';
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
      }, index * 100);
      
      // Add focus effect to inputs within section
      const inputs = section.querySelectorAll('.form-control-modern, .form-select');
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          section.style.borderLeftColor = '#667eea';
          section.style.borderLeftWidth = '5px';
          section.style.transform = 'translateX(5px)';
        });
        
        input.addEventListener('blur', () => {
          section.style.borderLeftWidth = '4px';
          section.style.transform = 'translateX(0)';
        });
      });
    });
  };

  // Toast notification
  window.showToast = function(message, type = 'success') {
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#fbbf24',
      info: '#3b82f6'
    };
    
    const icons = {
      success: 'check-circle-fill',
      error: 'x-circle-fill',
      warning: 'exclamation-triangle-fill',
      info: 'info-circle-fill'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 300px;
      border-left: 4px solid ${colors[type]};
      animation: slideInRight 0.4s ease-out;
    `;
    
    toast.innerHTML = `
      <i class="bi bi-${icons[type]}" style="color: ${colors[type]}; font-size: 1.5rem;"></i>
      <span style="flex: 1; font-weight: 600;">${message}</span>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #6c757d;">
        <i class="bi bi-x"></i>
      </button>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.4s ease-out';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  };

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      console.log('✅ Accounts enhancement module loaded');
    });
  }
})();
