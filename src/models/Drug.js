const mongoose = require('mongoose');

const drugSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Drug name is required'],
    trim: true,
    maxlength: [200, 'Drug name cannot exceed 200 characters']
  },
  genericName: {
    type: String,
    trim: true,
    maxlength: [200, 'Generic name cannot exceed 200 characters']
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [100, 'Brand name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Drug description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  comparePrice: {
    type: Number,
    min: [0, 'Compare price cannot be negative']
  },
  cost: {
    type: Number,
    min: [0, 'Cost cannot be negative']
  },
  sku: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  barcode: {
    type: String,
    trim: true
  },
  weight: {
    value: {
      type: Number,
      min: [0, 'Weight cannot be negative']
    },
    unit: {
      type: String,
      enum: ['mg', 'g', 'kg', 'ml', 'l'],
      default: 'mg'
    }
  },
  dosage: {
    strength: {
      type: Number,
      required: [true, 'Dosage strength is required']
    },
    unit: {
      type: String,
      required: [true, 'Dosage unit is required'],
      enum: ['mg', 'g', 'ml', 'mcg', 'IU', '%']
    }
  },
  form: {
    type: String,
    required: [true, 'Drug form is required'],
    enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'patch', 'powder', 'gel', 'spray']
  },
  manufacturer: {
    type: String,
    required: [true, 'Manufacturer is required'],
    trim: true,
    maxlength: [100, 'Manufacturer name cannot exceed 100 characters']
  },
  stock: {
    quantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    minStock: {
      type: Number,
      default: 10,
      min: [0, 'Minimum stock cannot be negative']
    },
    maxStock: {
      type: Number,
      default: 1000,
      min: [0, 'Maximum stock cannot be negative']
    }
  },
  images: [{
    public_id: String,
    url: String,
    alt: String
  }],
  prescriptionRequired: {
    type: Boolean,
    required: [true, 'Prescription requirement must be specified'],
    default: false
  },
  schedule: {
    type: String,
    enum: ['I', 'II', 'III', 'IV', 'V', 'OTC'],
    default: 'OTC'
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  manufactureDate: {
    type: Date,
    required: [true, 'Manufacture date is required']
  },
  batchNumber: {
    type: String,
    required: [true, 'Batch number is required'],
    trim: true
  },
  activeIngredients: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    concentration: {
      type: String,
      required: true
    }
  }],
  inactiveIngredients: [String],
  indications: [String],
  contraindications: [String],
  sideEffects: [String],
  warnings: [String],
  dosageInstructions: {
    type: String,
    trim: true
  },
  storageInstructions: {
    type: String,
    trim: true,
    default: 'Store in a cool, dry place away from direct sunlight'
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be below 0'],
      max: [5, 'Rating cannot be above 5']
    },
    count: {
      type: Number,
      default: 0
    }
  },
  salesCount: {
    type: Number,
    default: 0,
    min: [0, 'Sales count cannot be negative']
  },
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative']
  }
}, {
  timestamps: true
});

// Create SKU automatically if not provided
drugSchema.pre('save', function(next) {
  if (!this.sku) {
    const prefix = this.name.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    this.sku = `${prefix}${timestamp}`;
  }
  next();
});

// Check if drug is expired
drugSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiryDate;
});

// Check if drug is low in stock
drugSchema.virtual('isLowStock').get(function() {
  return this.stock.quantity <= this.stock.minStock;
});

// Check if drug is out of stock
drugSchema.virtual('isOutOfStock').get(function() {
  return this.stock.quantity === 0;
});

// Calculate days until expiry
drugSchema.virtual('daysUntilExpiry').get(function() {
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Index for faster queries
drugSchema.index({ name: 'text', description: 'text', genericName: 'text' });
drugSchema.index({ category: 1 });
drugSchema.index({ price: 1 });
drugSchema.index({ 'stock.quantity': 1 });
drugSchema.index({ isActive: 1 });
drugSchema.index({ prescriptionRequired: 1 });
drugSchema.index({ expiryDate: 1 });
drugSchema.index({ createdAt: -1 });
drugSchema.index({ salesCount: -1 });
drugSchema.index({ 'rating.average': -1 });

// Ensure virtual fields are serialized
drugSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Drug', drugSchema);