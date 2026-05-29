const express = require('express');
const router = express.Router();
const { googleAuth, googleRegister } = require('../controllers/googleAuthController');

// @route   POST /api/auth/google
// @desc    Authenticate with Google (check if user exists)
// @access  Public
router.post('/google', googleAuth);

// @route   POST /api/auth/google/register
// @desc    Register new user with Google + additional data
// @access  Public
router.post('/google/register', googleRegister);

module.exports = router;
