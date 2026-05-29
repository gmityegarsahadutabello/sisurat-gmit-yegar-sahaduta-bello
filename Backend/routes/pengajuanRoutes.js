const express = require('express');
const router = express.Router();
const {
  createPengajuan,
  getPengajuan,
  getPengajuanById,
  updatePengajuan,
  updateStatus,
  deletePengajuan,
  getPengajuanFile,
  getStorageStats,
  deleteArchives
} = require('../controllers/pengajuanController');

router.route('/')
  .get(getPengajuan)
  .post(createPengajuan);

// Storage stats endpoint (before /:id to avoid conflict)
router.route('/stats/storage').get(getStorageStats);

// Delete archives endpoint
router.route('/archives').delete(deleteArchives);

router.route('/:id')
  .get(getPengajuanById)
  .put(updatePengajuan)
  .delete(deletePengajuan);

// Minimal endpoint to return only a pre-signed file_url for a pengajuan
router.route('/:id/file').get(getPengajuanFile);

router.route('/:id/status').put(updateStatus);

module.exports = router;
