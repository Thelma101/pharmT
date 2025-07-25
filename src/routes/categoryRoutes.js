const express = require('express');
const router = express.Router();

const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryHierarchy,
  updateDrugCount
} = require('../controllers/categoryController');

const { protect, authorize } = require('../middleware/auth');
const { uploadCategoryImage } = require('../middleware/upload');
const {
  validateCategory,
  validateObjectId,
  handleValidationErrors
} = require('../middleware/validation');

// Public routes
router.get('/', getCategories);
router.get('/hierarchy', getCategoryHierarchy);
router.get('/:identifier', getCategory);

// Protected routes (Admin only)
router.use(protect, authorize('admin'));

router.post('/',
  uploadCategoryImage,
  validateCategory,
  handleValidationErrors,
  createCategory
);

router.put('/:id',
  validateObjectId,
  uploadCategoryImage,
  validateCategory,
  handleValidationErrors,
  updateCategory
);

router.delete('/:id',
  validateObjectId,
  handleValidationErrors,
  deleteCategory
);

router.patch('/:id/update-count',
  validateObjectId,
  handleValidationErrors,
  updateDrugCount
);

module.exports = router;