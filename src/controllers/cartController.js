const Cart = require('../models/Cart');
const Drug = require('../models/Drug');
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  badRequestResponse,
  createdResponse
} = require('../utils/apiResponse');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ 
      user: req.user.id, 
      isActive: true 
    }).populate({
      path: 'items.drug',
      select: 'name price images stock prescriptionRequired isActive'
    });

    // Create cart if it doesn't exist
    if (!cart) {
      cart = await Cart.create({ user: req.user.id });
    }

    // Filter out inactive drugs and update cart if necessary
    const activeItems = cart.items.filter(item => 
      item.drug && item.drug.isActive && item.drug.stock.quantity > 0
    );

    if (activeItems.length !== cart.items.length) {
      cart.items = activeItems;
      await cart.save();
    }

    return successResponse(res, { cart }, 'Cart retrieved successfully');
  } catch (error) {
    console.error('Get cart error:', error);
    return errorResponse(res, 'Error retrieving cart', 500);
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
const addToCart = async (req, res) => {
  try {
    const { drugId, quantity } = req.body;

    // Check if drug exists and is active
    const drug = await Drug.findOne({ 
      _id: drugId, 
      isActive: true 
    });

    if (!drug) {
      return notFoundResponse(res, 'Drug');
    }

    // Check stock availability
    if (drug.stock.quantity < quantity) {
      return badRequestResponse(
        res, 
        `Insufficient stock. Only ${drug.stock.quantity} items available.`
      );
    }

    // Get or create cart
    let cart = await Cart.findOrCreateCart(req.user.id);

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(item => 
      item.drug.toString() === drugId.toString()
    );

    if (existingItemIndex > -1) {
      // Update existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      // Check total quantity against stock
      if (drug.stock.quantity < newQuantity) {
        return badRequestResponse(
          res, 
          `Cannot add ${quantity} more items. Only ${drug.stock.quantity - cart.items[existingItemIndex].quantity} more can be added.`
        );
      }

      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].subtotal = drug.price * newQuantity;
    } else {
      // Add new item
      cart.items.push({
        drug: drugId,
        quantity,
        price: drug.price,
        subtotal: drug.price * quantity
      });
    }

    await cart.save();

    // Populate and return updated cart
    await cart.populate({
      path: 'items.drug',
      select: 'name price images stock prescriptionRequired'
    });

    return successResponse(res, { cart }, 'Item added to cart successfully');
  } catch (error) {
    console.error('Add to cart error:', error);
    
    if (error.name === 'CastError') {
      return badRequestResponse(res, 'Invalid drug ID');
    }

    return errorResponse(res, 'Error adding item to cart', 500);
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/update/:drugId
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const { drugId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ 
      user: req.user.id, 
      isActive: true 
    });

    if (!cart) {
      return notFoundResponse(res, 'Cart');
    }

    const itemIndex = cart.items.findIndex(item => 
      item.drug.toString() === drugId.toString()
    );

    if (itemIndex === -1) {
      return notFoundResponse(res, 'Item not found in cart');
    }

    if (quantity === 0) {
      // Remove item from cart
      cart.items.splice(itemIndex, 1);
    } else {
      // Check drug availability
      const drug = await Drug.findOne({ 
        _id: drugId, 
        isActive: true 
      });

      if (!drug) {
        return badRequestResponse(res, 'Drug is no longer available');
      }

      if (drug.stock.quantity < quantity) {
        return badRequestResponse(
          res, 
          `Insufficient stock. Only ${drug.stock.quantity} items available.`
        );
      }

      // Update quantity
      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].price = drug.price; // Update price in case it changed
      cart.items[itemIndex].subtotal = drug.price * quantity;
    }

    await cart.save();

    // Populate and return updated cart
    await cart.populate({
      path: 'items.drug',
      select: 'name price images stock prescriptionRequired'
    });

    return successResponse(res, { cart }, 'Cart updated successfully');
  } catch (error) {
    console.error('Update cart error:', error);
    
    if (error.name === 'CastError') {
      return badRequestResponse(res, 'Invalid drug ID');
    }

    return errorResponse(res, 'Error updating cart', 500);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:drugId
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const { drugId } = req.params;

    const cart = await Cart.findOne({ 
      user: req.user.id, 
      isActive: true 
    });

    if (!cart) {
      return notFoundResponse(res, 'Cart');
    }

    const itemIndex = cart.items.findIndex(item => 
      item.drug.toString() === drugId.toString()
    );

    if (itemIndex === -1) {
      return notFoundResponse(res, 'Item not found in cart');
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    // Populate and return updated cart
    await cart.populate({
      path: 'items.drug',
      select: 'name price images stock prescriptionRequired'
    });

    return successResponse(res, { cart }, 'Item removed from cart successfully');
  } catch (error) {
    console.error('Remove from cart error:', error);
    
    if (error.name === 'CastError') {
      return badRequestResponse(res, 'Invalid drug ID');
    }

    return errorResponse(res, 'Error removing item from cart', 500);
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Private
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ 
      user: req.user.id, 
      isActive: true 
    });

    if (!cart) {
      return notFoundResponse(res, 'Cart');
    }

    cart.items = [];
    await cart.save();

    return successResponse(res, { cart }, 'Cart cleared successfully');
  } catch (error) {
    console.error('Clear cart error:', error);
    return errorResponse(res, 'Error clearing cart', 500);
  }
};

// @desc    Validate cart before checkout
// @route   POST /api/cart/validate
// @access  Private
const validateCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ 
      user: req.user.id, 
      isActive: true 
    }).populate({
      path: 'items.drug',
      select: 'name price stock prescriptionRequired isActive'
    });

    if (!cart || cart.items.length === 0) {
      return badRequestResponse(res, 'Cart is empty');
    }

    const validationErrors = [];
    const validItems = [];

    for (const item of cart.items) {
      const drug = item.drug;
      
      if (!drug || !drug.isActive) {
        validationErrors.push({
          drugId: item.drug ? item.drug._id : 'unknown',
          drugName: item.drug ? item.drug.name : 'Unknown Drug',
          error: 'Drug is no longer available'
        });
        continue;
      }

      if (drug.stock.quantity < item.quantity) {
        validationErrors.push({
          drugId: drug._id,
          drugName: drug.name,
          error: `Insufficient stock. Only ${drug.stock.quantity} items available.`,
          availableQuantity: drug.stock.quantity,
          requestedQuantity: item.quantity
        });
        continue;
      }

      // Check if price has changed
      if (Math.abs(drug.price - item.price) > 0.01) {
        validationErrors.push({
          drugId: drug._id,
          drugName: drug.name,
          error: 'Price has changed',
          oldPrice: item.price,
          newPrice: drug.price
        });
      }

      validItems.push(item);
    }

    const response = {
      cart,
      isValid: validationErrors.length === 0,
      validItems,
      errors: validationErrors,
      summary: {
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        validItemsCount: validItems.length,
        errorCount: validationErrors.length
      }
    };

    return successResponse(res, response, 'Cart validation completed');
  } catch (error) {
    console.error('Validate cart error:', error);
    return errorResponse(res, 'Error validating cart', 500);
  }
};

// @desc    Apply cart updates (fix validation errors)
// @route   PATCH /api/cart/fix
// @access  Private
const fixCartIssues = async (req, res) => {
  try {
    const cart = await Cart.findOne({ 
      user: req.user.id, 
      isActive: true 
    });

    if (!cart) {
      return notFoundResponse(res, 'Cart');
    }

    const updatedItems = [];

    for (const item of cart.items) {
      const drug = await Drug.findOne({ 
        _id: item.drug, 
        isActive: true 
      });

      if (!drug) {
        // Remove inactive drugs
        continue;
      }

      // Update price if changed
      item.price = drug.price;

      // Adjust quantity if exceeds stock
      if (item.quantity > drug.stock.quantity) {
        item.quantity = Math.max(1, drug.stock.quantity);
      }

      // Recalculate subtotal
      item.subtotal = item.price * item.quantity;

      updatedItems.push(item);
    }

    cart.items = updatedItems;
    await cart.save();

    // Populate and return updated cart
    await cart.populate({
      path: 'items.drug',
      select: 'name price images stock prescriptionRequired'
    });

    return successResponse(res, { cart }, 'Cart issues fixed successfully');
  } catch (error) {
    console.error('Fix cart error:', error);
    return errorResponse(res, 'Error fixing cart issues', 500);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  validateCart,
  fixCartIssues
};