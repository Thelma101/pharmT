const express = require('express');
const router = express.Router();

const {
  getDrugs,
  getDrug,
  createDrug,
  updateDrug,
  deleteDrug,
  updateStock,
  getFeaturedDrugs,
  getLowStockDrugs
} = require('../controllers/drugController');

const { protect, authorize } = require('../middleware/auth');
const { uploadDrugImages } = require('../middleware/upload');
const {
  validateDrug,
  validateObjectId,
  validatePagination,
  validateSearch,
  handleValidationErrors
} = require('../middleware/validation');

// Public routes - specific routes first
router.get('/featured', getFeaturedDrugs);

router.get('/',
  validatePagination,
  validateSearch,
  handleValidationErrors,
  getDrugs
);

router.get('/:id',
  validateObjectId,
  handleValidationErrors,
  getDrug
);

// Protected routes (Admin only)
router.use(protect, authorize('admin'));

// Admin specific routes first
router.get('/admin/low-stock', getLowStockDrugs);

router.post('/',
  uploadDrugImages,
  validateDrug,
  handleValidationErrors,
  createDrug
);

router.put('/:id',
  validateObjectId,
  uploadDrugImages,
  validateDrug,
  handleValidationErrors,
  updateDrug
);

router.delete('/:id',
  validateObjectId,
  handleValidationErrors,
  deleteDrug
);

router.patch('/:id/stock',
  validateObjectId,
  handleValidationErrors,
  updateStock
);

module.exports = router;