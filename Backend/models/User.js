const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nik: {
    type: String,
    required: [true, 'NIK wajib diisi'],
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Nama wajib diisi'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email wajib diisi'],
    unique: true,
    lowercase: true,
    index: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Mohon isi email yang valid'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password wajib diisi'],
    minlength: 6,
    select: false // Don't return password by default
  },
  role: {
    type: String,
    enum: ['admin', 'tatausaha', 'sekretaris', 'pendeta', 'koordinator', 'jemaat'],
    default: 'jemaat',
    index: true
  },
  rayon: {
    type: String,
    default: null,
    index: true
  },
  address: {
    type: String,
    default: null
  },
  foto: {
    type: String,
    default: null
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  // Reset password fields
  is_password_sementara: {
    type: Boolean,
    default: false
  },
  reset_by_admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reset_by_admin_name: {
    type: String,
    default: null
  },
  reset_at: {
    type: Date,
    default: null
  },
  reset_reason: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Add 'id' field for frontend compatibility
      ret.id = ret._id.toString();
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Compound index for faster role-based queries
userSchema.index({ role: 1, rayon: 1 });

// Encrypt password using bcrypt
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
