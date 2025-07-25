const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Drug = require('../models/Drug');
const User = require('../models/User');
const {
  successResponse,
  errorResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  customPaginatedResponse
} = require('../utils/apiResponse');

// @desc    Create new order from cart
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { shippingAddress, billingAddress, paymentMethod, notes } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ 
      user: req.user.id, 
      isActive: true 
    }).populate('items.drug', 'name price stock prescriptionRequired');

    if (!cart || cart.items.length === 0) {
      return badRequestResponse(res, 'Cart is empty');
    }

    // Validate cart items and stock
    const orderItems = [];
    let subtotal = 0;
    let requiresPrescription = false;

    for (const item of cart.items) {
      const drug = item.drug;

      if (!drug || !drug.isActive) {
        return badRequestResponse(res, `Drug ${drug?.name || 'Unknown'} is no longer available`);
      }

      if (drug.stock.quantity < item.quantity) {
        return badRequestResponse(
          res, 
          `Insufficient stock for ${drug.name}. Only ${drug.stock.quantity} items available.`
        );
      }

      if (drug.prescriptionRequired) {
        requiresPrescription = true;
      }

      orderItems.push({
        drug: drug._id,
        name: drug.name,
        quantity: item.quantity,
        price: drug.price,
        subtotal: drug.price * item.quantity,
        prescriptionRequired: drug.prescriptionRequired
      });

      subtotal += drug.price * item.quantity;
    }

    // Calculate totals (you can add tax and shipping logic here)
    const tax = subtotal * 0.08; // 8% tax
    const shipping = subtotal > 50 ? 0 : 5.99; // Free shipping over $50
    const total = subtotal + tax + shipping;

    // Create order
    const orderData = {
      user: req.user.id,
      items: orderItems,
      shippingAddress: shippingAddress || req.user.address,
      billingAddress: billingAddress || shippingAddress || req.user.address,
      orderSummary: {
        subtotal,
        tax,
        shipping,
        total
      },
      paymentMethod,
      requiresPrescription,
      notes: {
        customer: notes
      }
    };

    const order = await Order.create(orderData);

    // Update drug stock and sales count
    for (const item of orderItems) {
      await Drug.findByIdAndUpdate(item.drug, {
        $inc: {
          'stock.quantity': -item.quantity,
          salesCount: item.quantity
        }
      });
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    // Populate order for response
    await order.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'items.drug', select: 'name images' }
    ]);

    return createdResponse(res, { order }, 'Order created successfully');
  } catch (error) {
    console.error('Create order error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return badRequestResponse(res, 'Validation error', errors);
    }

    return errorResponse(res, 'Error creating order', 500);
  }
};

// @desc    Get user's orders
// @route   GET /api/orders/my-orders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: req.user.id };
    if (status) {
      query.orderStatus = status;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [orders, totalDocs] = await Promise.all([
      Order.find(query)
        .populate('items.drug', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query)
    ]);

    return customPaginatedResponse(
      res,
      orders,
      pageNum,
      limitNum,
      totalDocs,
      'Orders retrieved successfully'
    );
  } catch (error) {
    console.error('Get my orders error:', error);
    return errorResponse(res, 'Error retrieving orders', 500);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('items.drug', 'name images');

    if (!order) {
      return notFoundResponse(res, 'Order');
    }

    // Check if user owns the order or is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return badRequestResponse(res, 'Not authorized to view this order');
    }

    return successResponse(res, { order }, 'Order retrieved successfully');
  } catch (error) {
    console.error('Get order error:', error);
    
    if (error.name === 'CastError') {
      return notFoundResponse(res, 'Order');
    }

    return errorResponse(res, 'Error retrieving order', 500);
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return notFoundResponse(res, 'Order');
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return badRequestResponse(res, 'Not authorized to cancel this order');
    }

    // Check if order can be cancelled
    if (!order.canBeCancelled) {
      return badRequestResponse(res, 'Order cannot be cancelled in current status');
    }

    // Cancel order
    await order.cancelOrder(reason || 'Cancelled by customer', req.user.id);

    // Restore stock
    for (const item of order.items) {
      await Drug.findByIdAndUpdate(item.drug, {
        $inc: {
          'stock.quantity': item.quantity,
          salesCount: -item.quantity
        }
      });
    }

    return successResponse(res, { order }, 'Order cancelled successfully');
  } catch (error) {
    console.error('Cancel order error:', error);
    
    if (error.name === 'CastError') {
      return notFoundResponse(res, 'Order');
    }

    return errorResponse(res, 'Error cancelling order', 500);
  }
};

// Admin Routes

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      paymentStatus, 
      startDate, 
      endDate,
      search,
      sort = '-createdAt'
    } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.orderStatus = status;
    }
    
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.firstName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [orders, totalDocs] = await Promise.all([
      Order.find(query)
        .populate('user', 'firstName lastName email')
        .populate('items.drug', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query)
    ]);

    return customPaginatedResponse(
      res,
      orders,
      pageNum,
      limitNum,
      totalDocs,
      'Orders retrieved successfully'
    );
  } catch (error) {
    console.error('Get all orders error:', error);
    return errorResponse(res, 'Error retrieving orders', 500);
  }
};

// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return notFoundResponse(res, 'Order');
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
      return badRequestResponse(res, 'Invalid order status');
    }

    await order.updateStatus(status, note, req.user.id);

    // Set delivery date if status is delivered
    if (status === 'delivered' && !order.actualDeliveryDate) {
      order.actualDeliveryDate = new Date();
      await order.save();
    }

    await order.populate('user', 'firstName lastName email');

    return successResponse(res, { order }, 'Order status updated successfully');
  } catch (error) {
    console.error('Update order status error:', error);
    
    if (error.name === 'CastError') {
      return notFoundResponse(res, 'Order');
    }

    return errorResponse(res, 'Error updating order status', 500);
  }
};

// @desc    Get order statistics (Admin only)
// @route   GET /api/orders/statistics
// @access  Private/Admin
const getOrderStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [
      totalOrders,
      orderStats,
      revenueStats,
      topDrugs
    ] = await Promise.all([
      Order.countDocuments(dateFilter),
      Order.getOrderStats(),
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$orderSummary.total' },
            averageOrderValue: { $avg: '$orderSummary.total' }
          }
        }
      ]),
      Order.aggregate([
        { $match: dateFilter },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.drug',
            name: { $first: '$items.name' },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.subtotal' }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }
      ])
    ]);

    const statistics = {
      totalOrders,
      ordersByStatus: orderStats,
      revenue: revenueStats[0] || { totalRevenue: 0, averageOrderValue: 0 },
      topSellingDrugs: topDrugs
    };

    return successResponse(res, statistics, 'Order statistics retrieved successfully');
  } catch (error) {
    console.error('Get order statistics error:', error);
    return errorResponse(res, 'Error retrieving order statistics', 500);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getOrderStatistics
};