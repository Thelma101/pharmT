const Drug = require('../models/Drug');
const Category = require('../models/Category');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const {
  successResponse,
  errorResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  customPaginatedResponse
} = require('../utils/apiResponse');

// @desc    Get all drugs with filtering and pagination
// @route   GET /api/drugs
// @access  Public
const getDrugs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      minPrice,
      maxPrice,
      prescriptionRequired,
      sort = '-createdAt',
      inStock = true
    } = req.query;

    // Build query object
    const query = { isActive: true };

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Prescription filter
    if (prescriptionRequired !== undefined) {
      query.prescriptionRequired = prescriptionRequired === 'true';
    }

    // Stock filter
    if (inStock === 'true') {
      query['stock.quantity'] = { $gt: 0 };
    }

    // Build sort object
    let sortObj = {};
    if (sort) {
      const sortFields = sort.split(',');
      sortFields.forEach(field => {
        if (field.startsWith('-')) {
          sortObj[field.substring(1)] = -1;
        } else {
          sortObj[field] = 1;
        }
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [drugs, totalDocs] = await Promise.all([
      Drug.find(query)
        .populate('category', 'name slug')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Drug.countDocuments(query)
    ]);

    return customPaginatedResponse(
      res,
      drugs,
      pageNum,
      limitNum,
      totalDocs,
      'Drugs retrieved successfully'
    );
  } catch (error) {
    console.error('Get drugs error:', error);
    return errorResponse(res, 'Error retrieving drugs', 500);
  }
};

// @desc    Get single drug by ID
// @route   GET /api/drugs/:id
// @access  Public
const getDrug = async (req, res) => {
  try {
    const drug = await Drug.findOne({ 
      _id: req.params.id, 
      isActive: true 
    }).populate('category', 'name description slug');

    if (!drug) {
      return notFoundResponse(res, 'Drug');
    }

    // Increment view count
    drug.viewCount += 1;
    await drug.save({ validateBeforeSave: false });

    return successResponse(res, { drug }, 'Drug retrieved successfully');
  } catch (error) {
    console.error('Get drug error:', error);
    if (error.name === 'CastError') {
      return notFoundResponse(res, 'Drug');
    }
    return errorResponse(res, 'Error retrieving drug', 500);
  }
};

// @desc    Create new drug
// @route   POST /api/drugs
// @access  Private/Admin
const createDrug = async (req, res) => {
  try {
    // Check if category exists
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return badRequestResponse(res, 'Invalid category ID');
      }
    }

    // Handle image uploads
    let images = [];
    if (req.files && req.files.length > 0) {
      try {
        for (const file of req.files) {
          let imageData;
          if (process.env.CLOUDINARY_CLOUD_NAME) {
            // Upload to Cloudinary
            imageData = await uploadImage(file.buffer || file.path, 'drugs');
          } else {
            // Local upload
            imageData = {
              url: `/uploads/drugs/${file.filename}`,
              public_id: file.filename
            };
          }
          
          images.push({
            url: imageData.url,
            public_id: imageData.public_id,
            alt: req.body.name || 'Drug image'
          });
        }
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return badRequestResponse(res, 'Error uploading images');
      }
    }

    // Create drug
    const drugData = {
      ...req.body,
      images
    };

    const drug = await Drug.create(drugData);
    await drug.populate('category', 'name description slug');

    return createdResponse(res, { drug }, 'Drug created successfully');
  } catch (error) {
    console.error('Create drug error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return badRequestResponse(res, 'Validation error', errors);
    }

    if (error.code === 11000) {
      return badRequestResponse(res, 'Drug with this SKU already exists');
    }

    return errorResponse(res, 'Error creating drug', 500);
  }
};

// @desc    Update drug
// @route   PUT /api/drugs/:id
// @access  Private/Admin
const updateDrug = async (req, res) => {
  try {
    let drug = await Drug.findById(req.params.id);

    if (!drug) {
      return notFoundResponse(res, 'Drug');
    }

    // Check if category exists (if provided)
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return badRequestResponse(res, 'Invalid category ID');
      }
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      try {
        const newImages = [];
        for (const file of req.files) {
          let imageData;
          if (process.env.CLOUDINARY_CLOUD_NAME) {
            imageData = await uploadImage(file.buffer || file.path, 'drugs');
          } else {
            imageData = {
              url: `/uploads/drugs/${file.filename}`,
              public_id: file.filename
            };
          }
          
          newImages.push({
            url: imageData.url,
            public_id: imageData.public_id,
            alt: req.body.name || drug.name || 'Drug image'
          });
        }
        
        // Add new images to existing ones
        req.body.images = [...(drug.images || []), ...newImages];
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return badRequestResponse(res, 'Error uploading images');
      }
    }

    // Update drug
    drug = await Drug.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('category', 'name description slug');

    return successResponse(res, { drug }, 'Drug updated successfully');
  } catch (error) {
    console.error('Update drug error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return badRequestResponse(res, 'Validation error', errors);
    }

    if (error.name === 'CastError') {
      return notFoundResponse(res, 'Drug');
    }

    return errorResponse(res, 'Error updating drug', 500);
  }
};

// @desc    Delete drug
// @route   DELETE /api/drugs/:id
// @access  Private/Admin
const deleteDrug = async (req, res) => {
  try {
    const drug = await Drug.findById(req.params.id);

    if (!drug) {
      return notFoundResponse(res, 'Drug');
    }

    // Delete associated images from Cloudinary
    if (drug.images && drug.images.length > 0 && process.env.CLOUDINARY_CLOUD_NAME) {
      for (const image of drug.images) {
        if (image.public_id) {
          try {
            await deleteImage(image.public_id);
          } catch (deleteError) {
            console.error('Error deleting image:', deleteError);
          }
        }
      }
    }

    // Soft delete - set isActive to false
    drug.isActive = false;
    await drug.save();

    return successResponse(res, null, 'Drug deleted successfully');
  } catch (error) {
    console.error('Delete drug error:', error);
    
    if (error.name === 'CastError') {
      return notFoundResponse(res, 'Drug');
    }

    return errorResponse(res, 'Error deleting drug', 500);
  }
};

// @desc    Update drug stock
// @route   PATCH /api/drugs/:id/stock
// @access  Private/Admin
const updateStock = async (req, res) => {
  try {
    const { quantity, operation = 'set' } = req.body;

    if (quantity === undefined || quantity < 0) {
      return badRequestResponse(res, 'Valid quantity is required');
    }

    const drug = await Drug.findById(req.params.id);

    if (!drug) {
      return notFoundResponse(res, 'Drug');
    }

    let newQuantity;
    switch (operation) {
      case 'add':
        newQuantity = drug.stock.quantity + parseInt(quantity);
        break;
      case 'subtract':
        newQuantity = Math.max(0, drug.stock.quantity - parseInt(quantity));
        break;
      case 'set':
      default:
        newQuantity = parseInt(quantity);
        break;
    }

    drug.stock.quantity = newQuantity;
    await drug.save();

    return successResponse(
      res, 
      { 
        drug: {
          _id: drug._id,
          name: drug.name,
          stock: drug.stock
        }
      }, 
      'Stock updated successfully'
    );
  } catch (error) {
    console.error('Update stock error:', error);
    
    if (error.name === 'CastError') {
      return notFoundResponse(res, 'Drug');
    }

    return errorResponse(res, 'Error updating stock', 500);
  }
};

// @desc    Get featured drugs
// @route   GET /api/drugs/featured
// @access  Public
const getFeaturedDrugs = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const drugs = await Drug.find({
      isActive: true,
      isFeatured: true,
      'stock.quantity': { $gt: 0 }
    })
    .populate('category', 'name slug')
    .sort({ salesCount: -1, 'rating.average': -1 })
    .limit(parseInt(limit))
    .lean();

    return successResponse(res, drugs, 'Featured drugs retrieved successfully');
  } catch (error) {
    console.error('Get featured drugs error:', error);
    return errorResponse(res, 'Error retrieving featured drugs', 500);
  }
};

// @desc    Get low stock drugs
// @route   GET /api/drugs/low-stock
// @access  Private/Admin
const getLowStockDrugs = async (req, res) => {
  try {
    const drugs = await Drug.find({
      isActive: true,
      $expr: { $lte: ['$stock.quantity', '$stock.minStock'] }
    })
    .populate('category', 'name slug')
    .sort({ 'stock.quantity': 1 })
    .lean();

    return successResponse(res, drugs, 'Low stock drugs retrieved successfully');
  } catch (error) {
    console.error('Get low stock drugs error:', error);
    return errorResponse(res, 'Error retrieving low stock drugs', 500);
  }
};

module.exports = {
  getDrugs,
  getDrug,
  createDrug,
  updateDrug,
  deleteDrug,
  updateStock,
  getFeaturedDrugs,
  getLowStockDrugs
};