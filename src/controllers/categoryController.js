const Category = require('../models/Category');
const Drug = require('../models/Drug');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const {
  successResponse,
  errorResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse
} = require('../utils/apiResponse');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const { includeInactive = false } = req.query;
    
    const query = includeInactive === 'true' ? {} : { isActive: true };
    
    const categories = await Category.find(query)
      .populate('parentCategory', 'name slug')
      .populate('subcategories', 'name slug')
      .sort({ name: 1 })
      .lean();

    return successResponse(res, categories, 'Categories retrieved successfully');
  } catch (error) {
    console.error('Get categories error:', error);
    return errorResponse(res, 'Error retrieving categories', 500);
  }
};

// @desc    Get single category by ID or slug
// @route   GET /api/categories/:identifier
// @access  Public
const getCategory = async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by ID first, then by slug
    let category = await Category.findOne({
      $or: [
        { _id: identifier },
        { slug: identifier }
      ],
      isActive: true
    })
    .populate('parentCategory', 'name slug')
    .populate('subcategories', 'name slug');

    if (!category) {
      return notFoundResponse(res, 'Category');
    }

    // Get drugs in this category
    const drugs = await Drug.find({
      category: category._id,
      isActive: true,
      'stock.quantity': { $gt: 0 }
    })
    .select('name price images prescriptionRequired rating')
    .limit(12)
    .lean();

    const categoryData = {
      ...category.toObject(),
      drugs
    };

    return successResponse(res, { category: categoryData }, 'Category retrieved successfully');
  } catch (error) {
    console.error('Get category error:', error);
    if (error.name === 'CastError') {
      return notFoundResponse(res, 'Category');
    }
    return errorResponse(res, 'Error retrieving category', 500);
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
  try {
    const { name, description, parentCategory } = req.body;

    // Check if category with same name already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return conflictResponse(res, 'Category with this name already exists');
    }

    // Validate parent category if provided
    if (parentCategory) {
      const parent = await Category.findById(parentCategory);
      if (!parent) {
        return badRequestResponse(res, 'Invalid parent category ID');
      }
    }

    // Handle image upload
    let image = null;
    if (req.file) {
      try {
        let imageData;
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          imageData = await uploadImage(req.file.buffer || req.file.path, 'categories');
        } else {
          imageData = {
            url: `/uploads/categories/${req.file.filename}`,
            public_id: req.file.filename
          };
        }
        
        image = {
          url: imageData.url,
          public_id: imageData.public_id
        };
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return badRequestResponse(res, 'Error uploading image');
      }
    }

    // Create category
    const categoryData = {
      name,
      description,
      parentCategory: parentCategory || null,
      image
    };

    const category = await Category.create(categoryData);

    // If this category has a parent, add it to parent's subcategories
    if (parentCategory) {
      await Category.findByIdAndUpdate(
        parentCategory,
        { $addToSet: { subcategories: category._id } }
      );
    }

    await category.populate('parentCategory', 'name slug');

    return createdResponse(res, { category }, 'Category created successfully');
  } catch (error) {
    console.error('Create category error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return badRequestResponse(res, 'Validation error', errors);
    }

    if (error.code === 11000) {
      return conflictResponse(res, 'Category with this name already exists');
    }

    return errorResponse(res, 'Error creating category', 500);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
  try {
    let category = await Category.findById(req.params.id);

    if (!category) {
      return notFoundResponse(res, 'Category');
    }

    // Check if name is being changed and if new name already exists
    if (req.body.name && req.body.name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: req.body.name,
        _id: { $ne: req.params.id }
      });
      if (existingCategory) {
        return conflictResponse(res, 'Category with this name already exists');
      }
    }

    // Validate parent category if provided
    if (req.body.parentCategory) {
      const parent = await Category.findById(req.body.parentCategory);
      if (!parent) {
        return badRequestResponse(res, 'Invalid parent category ID');
      }
      
      // Prevent circular reference
      if (req.body.parentCategory === req.params.id) {
        return badRequestResponse(res, 'Category cannot be its own parent');
      }
    }

    // Handle new image upload
    if (req.file) {
      try {
        // Delete old image from Cloudinary if exists
        if (category.image && category.image.public_id && process.env.CLOUDINARY_CLOUD_NAME) {
          await deleteImage(category.image.public_id);
        }

        let imageData;
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          imageData = await uploadImage(req.file.buffer || req.file.path, 'categories');
        } else {
          imageData = {
            url: `/uploads/categories/${req.file.filename}`,
            public_id: req.file.filename
          };
        }
        
        req.body.image = {
          url: imageData.url,
          public_id: imageData.public_id
        };
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return badRequestResponse(res, 'Error uploading image');
      }
    }

    // Update category
    category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('parentCategory', 'name slug');

    return successResponse(res, { category }, 'Category updated successfully');
  } catch (error) {
    console.error('Update category error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return badRequestResponse(res, 'Validation error', errors);
    }

    if (error.name === 'CastError') {
      return notFoundResponse(res, 'Category');
    }

    return errorResponse(res, 'Error updating category', 500);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return notFoundResponse(res, 'Category');
    }

    // Check if category has drugs
    const drugCount = await Drug.countDocuments({ 
      category: req.params.id,
      isActive: true 
    });

    if (drugCount > 0) {
      return badRequestResponse(
        res, 
        `Cannot delete category. It contains ${drugCount} active drug(s). Please move or delete the drugs first.`
      );
    }

    // Check if category has subcategories
    if (category.subcategories && category.subcategories.length > 0) {
      return badRequestResponse(
        res, 
        'Cannot delete category. It has subcategories. Please delete or reassign subcategories first.'
      );
    }

    // Delete image from Cloudinary
    if (category.image && category.image.public_id && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        await deleteImage(category.image.public_id);
      } catch (deleteError) {
        console.error('Error deleting image:', deleteError);
      }
    }

    // Remove from parent's subcategories if it has a parent
    if (category.parentCategory) {
      await Category.findByIdAndUpdate(
        category.parentCategory,
        { $pull: { subcategories: category._id } }
      );
    }

    // Soft delete - set isActive to false
    category.isActive = false;
    await category.save();

    return successResponse(res, null, 'Category deleted successfully');
  } catch (error) {
    console.error('Delete category error:', error);
    
    if (error.name === 'CastError') {
      return notFoundResponse(res, 'Category');
    }

    return errorResponse(res, 'Error deleting category', 500);
  }
};

// @desc    Get category hierarchy (tree structure)
// @route   GET /api/categories/hierarchy
// @access  Public
const getCategoryHierarchy = async (req, res) => {
  try {
    // Get all active categories
    const categories = await Category.find({ isActive: true })
      .populate('subcategories', 'name slug drugCount')
      .lean();

    // Build hierarchy (only root categories)
    const hierarchy = categories.filter(cat => !cat.parentCategory);

    return successResponse(res, hierarchy, 'Category hierarchy retrieved successfully');
  } catch (error) {
    console.error('Get category hierarchy error:', error);
    return errorResponse(res, 'Error retrieving category hierarchy', 500);
  }
};

// @desc    Update category drug count
// @route   PATCH /api/categories/:id/update-count
// @access  Private/Admin
const updateDrugCount = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return notFoundResponse(res, 'Category');
    }

    // Count active drugs in this category
    const drugCount = await Drug.countDocuments({
      category: req.params.id,
      isActive: true
    });

    category.drugCount = drugCount;
    await category.save();

    return successResponse(
      res, 
      { 
        category: {
          _id: category._id,
          name: category.name,
          drugCount: category.drugCount
        }
      }, 
      'Drug count updated successfully'
    );
  } catch (error) {
    console.error('Update drug count error:', error);
    
    if (error.name === 'CastError') {
      return notFoundResponse(res, 'Category');
    }

    return errorResponse(res, 'Error updating drug count', 500);
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryHierarchy,
  updateDrugCount
};