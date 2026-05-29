const User = require('../models/User');
const crypto = require('crypto');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { nik, name, email, password, role = 'jemaat', rayon } = req.body;

    // Validate required fields
    if (!nik || !name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Prevent duplicate by email or NIK
    const existing = await User.findOne({ $or: [{ email }, { nik }] });
    if (existing) {
      return res.status(409).json({ message: 'Email or NIK already registered' });
    }

    // Create user — password will be hashed by model pre-save hook
    const user = await User.create({ nik, name, email, password, role, rayon });

    return res.status(201).json({
      _id: user._id,
      id: user._id,
      nik: user.nik,
      name: user.name,
      email: user.email,
      role: user.role,
      rayon: user.rayon,
      foto: user.foto,
    });
  } catch (error) {
    // better error for duplicate key (race condition)
    if (error && error.code === 11000) {
      return res.status(409).json({ message: 'Duplicate key error' });
    }
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email/NIK and password are required' });
    }

    // Fetch user and include the password hash
    const user = await User.findOne({ $or: [{ email }, { nik: email }] }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Use model method to compare hashes
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Hide password in output
    const out = {
      _id: user._id,
      id: user._id,
      nik: user.nik,
      name: user.name,
      email: user.email,
      role: user.role,
      rayon: user.rayon,
      foto: user.foto,
      is_password_sementara: user.is_password_sementara || false, // Tambah flag password sementara
    };

    return res.json(out);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      res.json({
        _id: user._id,
        id: user._id,
        nik: user.nik,
        name: user.name,
        email: user.email,
        role: user.role,
        rayon: user.rayon,
        foto: user.foto,
        address: user.address
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.role = req.body.role || user.role;
      user.rayon = req.body.rayon || user.rayon;
      user.nik = req.body.nik || user.nik;
      
      if (req.body.foto !== undefined) {
        user.foto = req.body.foto;
      }
      
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        id: updatedUser._id,
        nik: updatedUser.nik,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        rayon: updatedUser.rayon,
        foto: updatedUser.foto,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      await user.deleteOne();
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password jemaat (generate password sementara)
// @route   POST /api/users/:id/reset-password
// @access  Private/Admin
const resetPasswordJemaat = async (req, res) => {
  try {
    const { admin_id, admin_name, reason } = req.body;

    // Validasi admin_id dan reason wajib ada
    if (!admin_id || !reason) {
      return res.status(400).json({ message: 'Admin ID dan alasan reset wajib diisi' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Hanya role jemaat yang bisa direset
    if (user.role !== 'jemaat') {
      return res.status(403).json({ message: 'Hanya akun jemaat yang dapat direset password oleh admin' });
    }

    // Generate password sementara (8 karakter: huruf + angka)
    const passwordSementara = crypto.randomBytes(4).toString('hex'); // 8 char hex

    // Set password sementara (akan di-hash oleh pre-save hook)
    user.password = passwordSementara;
    user.is_password_sementara = true;
    user.reset_by_admin_id = admin_id;
    user.reset_by_admin_name = admin_name || 'Admin';
    user.reset_at = new Date();
    user.reset_reason = reason;

    await user.save();

    console.log(`✅ Password jemaat ${user.name} (${user.email}) berhasil direset oleh ${admin_name}`);

    return res.json({
      message: 'Password berhasil direset',
      user_id: user._id,
      user_name: user.name,
      user_email: user.email,
      password_sementara: passwordSementara, // Kirim ke admin untuk diberikan ke jemaat
      reset_at: user.reset_at,
      reset_by: admin_name
    });

  } catch (error) {
    console.error('❌ Error reset password:', error);
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Ganti password permanent (setelah login dengan password sementara)
// @route   POST /api/users/change-password-permanent
// @access  Private/Jemaat
const changePasswordPermanent = async (req, res) => {
  try {
    const { user_id, new_password, confirm_password } = req.body;

    // Validasi input
    if (!user_id || !new_password || !confirm_password) {
      return res.status(400).json({ message: 'User ID, password baru, dan konfirmasi password wajib diisi' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ message: 'Password baru dan konfirmasi tidak cocok' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter' });
    }

    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Hanya jemaat dengan password sementara yang bisa ganti permanent
    if (!user.is_password_sementara) {
      return res.status(403).json({ message: 'Akun Anda tidak dalam status password sementara' });
    }

    // Set password permanent
    user.password = new_password;
    user.is_password_sementara = false;
    user.reset_by_admin_id = null;
    user.reset_by_admin_name = null;
    user.reset_at = null;
    user.reset_reason = null;

    await user.save();

    console.log(`✅ Password jemaat ${user.name} berhasil diubah menjadi permanent`);

    return res.json({
      message: 'Password berhasil diubah menjadi permanent',
      user_id: user._id,
      user_name: user.name,
      user_email: user.email
    });

  } catch (error) {
    console.error('❌ Error ganti password permanent:', error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetPasswordJemaat,
  changePasswordPermanent,
};
