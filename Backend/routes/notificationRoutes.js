const express = require('express');
const router = express.Router();
const {
  getNotifications,
  createNotification,
  markAsRead,
  deleteNotification
} = require('../controllers/notificationController');

router.route('/')
  .get(getNotifications)
  .post(createNotification);

router.route('/:id/read').put(markAsRead);
router.route('/:id').delete(deleteNotification);

module.exports = router;
