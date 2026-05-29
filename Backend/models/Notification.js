const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Frontend uses 'user_id' (string)
  user_id: {
    type: String,
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Optional because some notifs are role-based
  },
  to_role: {
    type: String,
    default: null
  },
  to_nik: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: [
      'info', 'success', 'warning', 'error',
      
      // Notifikasi Jemaat (sesuai ALUR_KERJA_SISTEM.md)
      'surat_dibuat',     // 📄 Biru - Saat jemaat submit pengajuan
      'surat_ditolak',    // ❌ Merah - Koordinator tolak pengajuan
      'surat_masuk',      // ✅ Hijau - Pendeta validasi final (surat selesai)
      
      // Notifikasi Internal Staff
      'surat_diterima',   // Koordinator -> TU
      'surat_disposisi',  // TU -> Sekretaris -> Pendeta
      'surat_validated',  // Pendeta -> TU
      'surat_returned',   // Sekretaris/Pendeta -> TU (Revisi)
      'surat_archived'    // Archived
    ],
    default: 'info'
  },
  // Frontend uses 'judul' and 'pesan'
  title: {
    type: String,
    required: true
  },
  judul: { type: String }, // Alias
  message: {
    type: String,
    required: true
  },
  pesan: { type: String }, // Alias
  
  related_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pengajuan',
    default: null
  },
  pengajuan_id: { type: String }, // String ID from frontend
  ref_id: { type: String }, // Alias
  
  is_read: {
    type: Boolean,
    default: false
  },
  read: { type: Boolean }, // Alias
  
  url: {
    type: String,
    default: ''
  },
  
  tanggal: { type: Date } // Frontend timestamp field
}, {
  timestamps: { createdAt: 'tanggal', updatedAt: 'updatedAt' },
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for faster queries
notificationSchema.index({ user_id: 1, is_read: 1 });
notificationSchema.index({ to_role: 1, is_read: 1 });
notificationSchema.index({ to_nik: 1, is_read: 1 });
notificationSchema.index({ tanggal: -1 });

// Pre-save hook to sync aliases
notificationSchema.pre('save', function() {
  if (!this.judul && this.title) this.judul = this.title;
  if (!this.title && this.judul) this.title = this.judul;
  if (!this.pesan && this.message) this.pesan = this.message;
  if (!this.message && this.pesan) this.message = this.pesan;
  if (!this.read && this.is_read !== undefined) this.read = this.is_read;
  if (!this.is_read && this.read !== undefined) this.is_read = this.read;
});

// Explicitly set collection name
module.exports = mongoose.model('Notification', notificationSchema, 'notifications');
