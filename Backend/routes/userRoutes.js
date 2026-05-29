const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetPasswordJemaat,
  changePasswordPermanent,
} = require('../controllers/userController');

router.route('/').get(getUsers);
router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/change-password-permanent').post(changePasswordPermanent);
router.route('/:id').get(getUserById).put(updateUser).delete(deleteUser);
router.route('/:id/reset-password').post(resetPasswordJemaat);

module.exports = router;
