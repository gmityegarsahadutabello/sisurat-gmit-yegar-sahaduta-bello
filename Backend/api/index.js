const app = require('../app');
const connectDB = require('../config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return res.status(500).json({ message: 'Database connection error' });
  }

  return app(req, res);
};
