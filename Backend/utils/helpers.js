/**
 * Backend Helper Utilities
 * Common functions for database operations, notifications, etc.
 */

const Notification = require('../models/Notification');

/**
 * Create a notification
 * @param {Object} options - Notification options
 * @param {String} options.to_role - Target role
 * @param {String} options.to_nik - Target NIK
 * @param {String} options.user_id - Target user ID
 * @param {String} options.type - Notification type
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {String} options.related_id - Related Pengajuan ID
 * @param {String} options.url - Optional URL
 */
async function createNotification({
  to_role = null,
  to_nik = null,
  user_id = null,
  type = 'info',
  title,
  message,
  related_id = null,
  url = ''
}) {
  try {
    const notification = await Notification.create({
      user_id,
      to_role,
      to_nik,
      type,
      title,
      judul: title,
      message,
      pesan: message,
      related_id,
      url
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

/**
 * Generate nomor surat (letter number)
 * Format: XXX/GMIT-YEGAR/RAYON/MM/YYYY
 * @param {Number} sequence - Sequential number
 * @param {String} rayon - Rayon name
 * @param {String} type - Letter type
 */
function generateNomorSurat(sequence, rayon, type = '') {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const seq = String(sequence).padStart(3, '0');
  
  const typeCode = getTypeCode(type);
  const rayonCode = rayon ? rayon.toUpperCase() : 'UMUM';
  
  return `${seq}/${typeCode}/GMIT-YEGAR/${rayonCode}/${month}/${year}`;
}

/**
 * Get letter type code
 */
function getTypeCode(type) {
  const codes = {
    'baptis': 'BAP',
    'sidi': 'SID',
    'nikah': 'NIK',
    'kematian': 'KEM',
    'pindah': 'PIN',
    'aktif': 'AKT',
    'permohonan': 'PRM',
    'keterangan': 'KET'
  };
  return codes[type?.toLowerCase()] || 'SRT';
}

/**
 * Format date to Indonesian locale
 */
function formatDateID(date) {
  const d = new Date(date);
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Jakarta'
  };
  return d.toLocaleDateString('id-ID', options);
}

/**
 * Format date time to Indonesian locale
 */
function formatDateTimeID(date) {
  const d = new Date(date);
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  };
  return d.toLocaleString('id-ID', options);
}

/**
 * Sanitize user input (prevent XSS)
 */
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '')
    .trim();
}

/**
 * Validate NIK format (16 digits)
 */
function validateNIK(nik) {
  return /^\d{16}$/.test(nik);
}

/**
 * Validate email format
 */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Get status display name in Bahasa Indonesia
 */
function getStatusDisplay(status) {
  const statusMap = {
    'baru': 'Baru',
    'submitted': 'Diajukan',
    'draft': 'Draft',
    'proses': 'Dalam Proses',
    'diterima': 'Diterima',
    'verified_by_koordinator': 'Diverifikasi Koordinator',
    'rejected_by_koor': 'Ditolak Koordinator',
    'ditolak': 'Ditolak',
    'file_uploaded': 'File Diupload',
    'disposisi_tu': 'Disposisi TU',
    'disposisi_to_tatausaha': 'Diteruskan ke Tata Usaha',
    'disposisi_to_sekretaris': 'Diteruskan ke Sekretaris',
    'returned_by_sekretaris': 'Dikembalikan Sekretaris',
    'validated_by_sekretaris': 'Divalidasi Sekretaris',
    'disposisi_to_pendeta': 'Diteruskan ke Pendeta',
    'returned_by_pendeta': 'Dikembalikan Pendeta',
    'validated_by_pendeta': 'Divalidasi Pendeta',
    'kembali': 'Dikembalikan',
    'validated': 'Tervalidasi',
    'arsip': 'Diarsipkan',
    'archived': 'Diarsipkan'
  };
  return statusMap[status] || status;
}

/**
 * Check if user can access pengajuan based on role
 */
function canAccessPengajuan(user, pengajuan) {
  if (user.role === 'admin') return true;
  
  if (user.role === 'jemaat') {
    // Jemaat can only see their own submissions
    return pengajuan.user_id === user._id.toString() || 
           pengajuan.user_nik === user.nik;
  }
  
  if (user.role === 'koordinator') {
    // Koordinator can see submissions from their rayon
    return pengajuan.rayon === user.rayon;
  }
  
  // Staff (TU, Sekretaris, Pendeta) can see all
  return ['tatausaha', 'sekretaris', 'pendeta'].includes(user.role);
}

module.exports = {
  createNotification,
  generateNomorSurat,
  getTypeCode,
  formatDateID,
  formatDateTimeID,
  sanitizeInput,
  validateNIK,
  validateEmail,
  getStatusDisplay,
  canAccessPengajuan
};
