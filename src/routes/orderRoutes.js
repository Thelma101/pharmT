const express = require('express');
const router = express.Router();

const {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getOrderStatistics
} = require('../controllers/orderController');

const { protect, authorize } = require('../middleware/auth');
const {
  validateOrder,
  validateObjectId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation');

// All order routes require authentication
router.use(protect);

// User specific routes first
router.get('/my-orders',
  validatePagination,
  handleValidationErrors,
  getMyOrders
);

router.post('/',
  validateOrder,
  handleValidationErrors,
  createOrder
);

router.get('/:id',
  validateObjectId,
  handleValidationErrors,
  getOrder
);

router.put('/:id/cancel',
  validateObjectId,
  handleValidationErrors,
  cancelOrder
);

// Admin only routes
router.use(authorize('admin'));

// Admin specific routes first
router.get('/admin/statistics', getOrderStatistics);

router.get('/',
  validatePagination,
  handleValidationErrors,
  getAllOrders
);

router.put('/:id/status',
  validateObjectId,
  handleValidationErrors,
  updateOrderStatus
);

module.exports = router;