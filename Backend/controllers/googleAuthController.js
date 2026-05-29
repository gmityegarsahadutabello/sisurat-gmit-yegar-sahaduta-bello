const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Verify Google token and authenticate/register user
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, email_verified, sub: googleId } = payload;

    // Check if email is verified
    if (!email_verified) {
      return res.status(400).json({ message: 'Email belum diverifikasi oleh Google' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // User sudah terdaftar, return data user untuk login
      return res.json({
        action: 'login',
        user: {
          _id: existingUser._id,
          id: existingUser._id,
          nik: existingUser.nik,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          rayon: existingUser.rayon,
          foto: existingUser.foto,
        }
      });
    } else {
      // User belum terdaftar, return data untuk form registrasi
      return res.json({
        action: 'register',
        googleData: {
          email,
          name,
          googleId,
          emailVerified: email_verified
        }
      });
    }
  } catch (error) {
    console.error('Google Auth Error:', error);
    
    // Handle specific errors
    if (error.message && error.message.includes('Token used too late')) {
      return res.status(401).json({ message: 'Token Google sudah kadaluarsa. Silakan coba lagi.' });
    }
    
    return res.status(500).json({ 
      message: 'Gagal memverifikasi akun Google. Silakan coba lagi.',
      error: error.message 
    });
  }
};

// @desc    Register user with Google data + additional info
// @route   POST /api/auth/google/register
// @access  Public
const googleRegister = async (req, res) => {
  try {
    const { email, name, googleId, nik, rayon } = req.body;

    // Validate required fields
    if (!email || !name || !googleId || !nik || !rayon) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists
    const existing = await User.findOne({ $or: [{ email }, { nik }] });
    if (existing) {
      return res.status(409).json({ message: 'Email atau NIK sudah terdaftar' });
    }

    // Create user with Google data
    // Generate a random password since login will be via Google
    const randomPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);
    
    const user = await User.create({ 
      nik, 
      name, 
      email, 
      password: randomPassword, // Random password, user will login via Google
      role: 'jemaat', 
      rayon,
      googleId // Store Google ID for future reference
    });

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
    console.error('Google Register Error:', error);
    
    if (error && error.code === 11000) {
      return res.status(409).json({ message: 'Email atau NIK sudah terdaftar' });
    }
    
    return res.status(500).json({ 
      message: 'Gagal mendaftarkan akun. Silakan coba lagi.',
      error: error.message 
    });
  }
};

module.exports = {
  googleAuth,
  googleRegister,
};
