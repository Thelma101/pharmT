const express = require('express');
const router = express.Router();

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  validateCart,
  fixCartIssues
} = require('../controllers/cartController');

const { protect } = require('../middleware/auth');
const {
  validateAddToCart,
  validateUpdateCartItem,
  validateObjectId,
  validateDrugId,
  handleValidationErrors
} = require('../middleware/validation');

// All cart routes require authentication
router.use(protect);

router.get('/', getCart);

router.post('/add',
  validateAddToCart,
  handleValidationErrors,
  addToCart
);

router.put('/update/:drugId',
  validateDrugId,
  validateUpdateCartItem,
  handleValidationErrors,
  updateCartItem
);

router.delete('/remove/:drugId',
  validateDrugId,
  handleValidationErrors,
  removeFromCart
);

router.delete('/clear', clearCart);

router.post('/validate', validateCart);

router.patch('/fix', fixCartIssues);

module.exports = router;