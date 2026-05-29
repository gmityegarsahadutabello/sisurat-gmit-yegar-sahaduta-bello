const mongoose = require('mongoose');

// Reusable timeline subdocument (frontend-compatible)
const timelineSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  by: { type: String, required: true },
  action: { type: String, required: true },
  note: { type: String, default: '' }
}, { _id: false });

const pengajuanSchema = new mongoose.Schema({
  // --- Reference to User (ObjectId) ---
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  // --- Denormalized User Data (matches frontend user_id, user_nik, user_nama, user_email, user_rayon) ---
  user_id: { type: String, required: true }, // Can be string ID from frontend
  user_nik: { type: String, required: true },
  user_nama: { type: String, required: true },
  user_email: { type: String },
  user_rayon: { type: String }, // Same as 'rayon' field

  // --- Rayon (critical for filtering) ---
  rayon: { type: String, required: true },

  // --- Tipe/Jenis Surat (merged) ---
  type: { type: String, required: true, index: true }, // merged: type/tipe/jenis
  // keep legacy alias for backward compatibility handling via virtuals
  tipe: { type: String },

  // --- Status Flow (sesuai ALUR_KERJA_SISTEM.md) ---
  status: {
    type: String,
    enum: [
      // main statuses only
      'proses',
      'diterima',
      'ditolak',
      'disposisi_to_sekretaris',
      'disposisi_to_pendeta',
      'disposisi_to_tatausaha',
      'validated_by_pendeta',
      'arsip',
    ],
    default: 'proses',
    index: true
  },

  // --- Form Data (flexible Mixed type for all surat types) ---
  form: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  meta: { // Additional metadata
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // --- Grouped Notes ---
  notes: {
    koor: { type: String, default: '' },
    sekretaris: { type: String, default: '' },
    pendeta: { type: String, default: '' },
    rejection: { type: String, default: '' },
    return: { type: String, default: '' }
  },

  // --- Grouped Files (S3 Object Storage based) ---
  files: {
    draft: {
      key: { type: String, default: '' }, // S3 Object Key
      name: { type: String, default: '' },
      mime: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploaded_at: { type: Date },
      uploaded_by: { type: String, default: '' }
    },
    final: {
      key: { type: String, default: '' }, // S3 Object Key
      name: { type: String, default: '' },
      mime: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploaded_at: { type: Date },
      uploaded_by: { type: String, default: '' }
    }
  },

  // --- Numbering (simplified) ---
  nomor: { type: String, default: '' },
  nomor_surat: { type: String, default: null }, // legacy alias
  nomor_seq: { type: Number, default: 0 },

  // --- Timestamps & Validation ---
  validated_at: { type: Date },
  archived_at: { type: Date },
  verifiedAt: { type: Date },
  tanggal: { type: Date }, // Creation date alias

  // --- Timeline (audit trail) ---
  timeline: { type: [timelineSchema], default: [] },
  history: { type: [timelineSchema], default: [] } // legacy alias

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'last_updated' },
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // expose id instead of _id
      ret.id = ret._id?.toString();
      delete ret.__v;

      // nomor_surat legacy - always expose both
      if (ret.nomor && !ret.nomor_surat) ret.nomor_surat = ret.nomor;
      if (!ret.nomor && ret.nomor_surat) ret.nomor = ret.nomor_surat;

      // legacy file fields - CRITICAL for frontend compatibility
      // The actual file URL will be generated on-the-fly in the controller (pre-signed URL)
      // We just provide metadata here.
      const f = ret.files?.final || {};
      ret.final_file_url = ret.file_url || ''; // This will be populated by the controller
      ret.final_file_name = f.name || '';
      ret.final_file_type = f.mime || '';
      ret.final_file_size = f.size || 0;
      ret.file_name = ret.final_file_name || ret.files?.draft?.name || '';

      // Deprecated fields, return empty string to avoid breaking old frontend logic
      ret.final_file = ''; 
      ret.final_file_data = '';

      // legacy history mirror
      ret.history = ret.timeline || [];
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id?.toString();
      delete ret.__v;
      // nomor_surat legacy - always expose both
      if (ret.nomor && !ret.nomor_surat) ret.nomor_surat = ret.nomor;
      if (!ret.nomor && ret.nomor_surat) ret.nomor = ret.nomor_surat;

      const f = ret.files?.final || {};
      ret.final_file_url = ret.file_url || ''; // Populated by controller
      ret.final_file_name = f.name || '';
      ret.final_file_type = f.mime || '';
      ret.final_file_size = f.size || 0;
      ret.file_name = ret.final_file_name || ret.files?.draft?.name || '';

      // Deprecated fields
      ret.final_file = '';
      ret.final_file_data = '';

      ret.history = ret.timeline || [];
      return ret;
    }
  }
});

// Indexes for performance
pengajuanSchema.index({ user_id: 1 });
pengajuanSchema.index({ rayon: 1 });
pengajuanSchema.index({ status: 1 });
pengajuanSchema.index({ created_at: -1 });
pengajuanSchema.index({ type: 1 });
pengajuanSchema.index({ user_nik: 1 });
// Compound index { rayon: 1, status: 1, created_at: -1 }
pengajuanSchema.index({ rayon: 1, status: 1, created_at: -1 });

// Virtuals for backward compatibility
pengajuanSchema.virtual('id').get(function() {
  return this._id ? this._id.toString() : undefined;
});
// Legacy virtuals for file aliases - now they just point to metadata
pengajuanSchema.virtual('final_file_name').get(function () {
  return this.files?.final?.name || '';
});
pengajuanSchema.virtual('file_name').get(function () {
  return this.files?.final?.name || this.files?.draft?.name || '';
});

// Pre-save hook to sync aliases
pengajuanSchema.pre('save', function() {
  // Sync type/tipe
  if (!this.type && this.tipe) this.type = this.tipe;
  if (!this.tipe && this.type) this.tipe = this.type;
  
  // Sync legacy file aliases into grouped structure
  if (this.final_file_name) {
    this.files = this.files || {};
    this.files.final = this.files.final || {};
    if (this.final_file_name && !this.files.final.name) this.files.final.name = this.final_file_name;
  }
  if (this.file_name && (!this.files || !this.files.final || !this.files.final.name)) {
    this.files = this.files || {};
    this.files.final = this.files.final || {};
    this.files.final.name = this.file_name;
  }
  if (this.file_name && (!this.files || !this.files.final || !this.files.final.name)) {
    this.files = this.files || {};
    this.files.final = this.files.final || {};
    this.files.final.name = this.file_name;
  }
  
  // Sync nomor
  if (!this.nomor && this.nomor_surat) this.nomor = this.nomor_surat;
  if (!this.nomor_surat && this.nomor) this.nomor_surat = this.nomor;
  
  // Sync history/timeline
  if (this.history && !this.timeline) this.timeline = this.history;
  if (this.timeline && !this.history) this.history = this.timeline;
  
  // Sync rayon
  if (!this.rayon && this.user_rayon) this.rayon = this.user_rayon;
  if (!this.user_rayon && this.rayon) this.user_rayon = this.rayon;

  // Normalize legacy statuses to main ones if needed
  const LEGACY_STATUS_MAP = {
    baru: 'proses',
    submitted: 'proses',
    draft: 'proses',
    verified_by_koordinator: 'diterima',
    rejected_by_koor: 'ditolak',
    file_uploaded: 'disposisi_to_sekretaris',
    disposisi_tu: 'disposisi_to_sekretaris',
    returned_by_sekretaris: 'disposisi_to_tatausaha',
    validated_by_sekretaris: 'disposisi_to_pendeta',
    returned_by_pendeta: 'disposisi_to_tatausaha',
    kembali: 'disposisi_to_tatausaha',
    validated: 'validated_by_pendeta',
    archived: 'arsip'
  };
  if (this.status && !['proses','diterima','ditolak','disposisi_to_sekretaris','disposisi_to_pendeta','disposisi_to_tatausaha','validated_by_pendeta','arsip'].includes(this.status)) {
    const normalized = LEGACY_STATUS_MAP[this.status];
    if (normalized) this.status = normalized;
  }
});

module.exports = mongoose.model('Pengajuan', pengajuanSchema);
