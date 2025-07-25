const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  drug: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Drug',
    required: [true, 'Drug is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [999, 'Quantity cannot exceed 999']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  }
}, {
  _id: false
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    unique: true
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0,
    min: [0, 'Total items cannot be negative']
  },
  totalAmount: {
    type: Number,
    default: 0,
    min: [0, 'Total amount cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate totals before saving
cartSchema.pre('save', function(next) {
  // Calculate totals
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  this.totalAmount = this.items.reduce((total, item) => total + item.subtotal, 0);
  this.lastModified = new Date();
  
  // Calculate subtotal for each item
  this.items.forEach(item => {
    item.subtotal = item.price * item.quantity;
  });
  
  next();
});

// Index for faster queries
cartSchema.index({ user: 1 });
cartSchema.index({ isActive: 1 });
cartSchema.index({ lastModified: -1 });

// Instance method to add item to cart
cartSchema.methods.addItem = function(drugId, quantity, price) {
  const existingItemIndex = this.items.findIndex(item => 
    item.drug.toString() === drugId.toString()
  );

  if (existingItemIndex > -1) {
    // Update existing item
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].subtotal = 
      this.items[existingItemIndex].price * this.items[existingItemIndex].quantity;
  } else {
    // Add new item
    this.items.push({
      drug: drugId,
      quantity: quantity,
      price: price,
      subtotal: price * quantity
    });
  }

  return this.save();
};

// Instance method to remove item from cart
cartSchema.methods.removeItem = function(drugId) {
  this.items = this.items.filter(item => 
    item.drug.toString() !== drugId.toString()
  );
  return this.save();
};

// Instance method to update item quantity
cartSchema.methods.updateItemQuantity = function(drugId, quantity) {
  const itemIndex = this.items.findIndex(item => 
    item.drug.toString() === drugId.toString()
  );

  if (itemIndex > -1) {
    if (quantity <= 0) {
      this.items.splice(itemIndex, 1);
    } else {
      this.items[itemIndex].quantity = quantity;
      this.items[itemIndex].subtotal = 
        this.items[itemIndex].price * quantity;
    }
  }

  return this.save();
};

// Instance method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  return this.save();
};

// Static method to find or create cart for user
cartSchema.statics.findOrCreateCart = async function(userId) {
  let cart = await this.findOne({ user: userId, isActive: true });
  
  if (!cart) {
    cart = new this({ user: userId });
    await cart.save();
  }
  
  return cart;
};

module.exports = mongoose.model('Cart', cartSchema);