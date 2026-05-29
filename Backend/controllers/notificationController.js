const Notification = require('../models/Notification');

// @desc    Get notifications for a user or role
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const { user_id, role, nik } = req.query;
    let query = {};

    // Build query based on parameters
    const conditions = [];

    if (user_id) {
      conditions.push({ user_id: user_id });
    }
    if (role) {
      conditions.push({ to_role: role });
    }
    if (nik) {
      conditions.push({ to_nik: nik });
      conditions.push({ to_nik: String(nik) }); // Ensure string type
    }

    // If we have conditions, use $or, otherwise return empty
    if (conditions.length > 0) {
      query.$or = conditions;
    } else {
      console.log('⚠️ No query parameters provided');
      return res.json([]);
    }

    console.log('🔔 Backend - Notification Query:', JSON.stringify(query, null, 2));
    
    // Debug: Try simple query first
    const allNotifs = await Notification.find({});
    console.log('🔔 Backend - Total notifications in DB:', allNotifs.length);
    if (allNotifs.length > 0) {
      console.log('🔔 Backend - Sample notif to_nik:', allNotifs[0].to_nik, 'type:', typeof allNotifs[0].to_nik);
    }
    
    const notifications = await Notification.find(query).sort({ tanggal: -1, createdAt: -1 });
    
    console.log('🔔 Backend - Found notifications:', notifications.length);
    if (notifications.length > 0) {
      console.log('🔔 Backend - Sample notification:', {
        id: notifications[0]._id,
        to_nik: notifications[0].to_nik,
        to_role: notifications[0].to_role,
        title: notifications[0].title
      });
    }
    
    // Transform to ensure all alias fields are populated
    const transformed = notifications.map(doc => {
      const obj = doc.toObject();
      // Add id field
      obj.id = obj._id.toString();
      // Ensure aliases are populated
      obj.at = obj.tanggal || obj.createdAt;
      obj.read = obj.is_read || false;
      obj.judul = obj.title || obj.judul;
      obj.pesan = obj.message || obj.pesan;
      return obj;
    });
    
    console.log('🔔 Backend - Sending', transformed.length, 'notifications');
    res.json(transformed);
  } catch (error) {
    console.error('❌ Error getting notifications:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a notification
// @route   POST /api/notifications
// @access  Private (Internal use mostly)
const createNotification = async (req, res) => {
  try {
    const { user, to_role, to_nik, type, title, message, related_id, url } = req.body;
    
    const notification = await Notification.create({
      user,
      to_role,
      to_nik,
      type,
      title,
      message,
      related_id,
      url
    });

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (notification) {
      notification.is_read = true;
      const updatedNotification = await notification.save();
      res.json(updatedNotification);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (notification) {
      await notification.deleteOne();
      res.json({ message: 'Notification removed' });
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNotifications,
  createNotification,
  markAsRead,
  deleteNotification
};
