const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const createUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WebP) are allowed!'), false);
  }
};

// File filter for documents (prescriptions)
const documentFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf' || 
                   file.mimetype === 'application/msword' || 
                   file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed for prescriptions!'), false);
  }
};

// Storage configuration for local uploads
const createStorage = (destination) => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(__dirname, '../../uploads', destination);
      createUploadDir(uploadPath);
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      // Create unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  });
};

// Memory storage for Cloudinary uploads
const memoryStorage = multer.memoryStorage();

// File size limits
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
  files: 5 // Maximum 5 files
};

// Drug image upload configuration
const uploadDrugImages = multer({
  storage: process.env.CLOUDINARY_CLOUD_NAME ? memoryStorage : createStorage('drugs'),
  limits: limits,
  fileFilter: imageFilter
}).array('images', 5);

// Category image upload configuration
const uploadCategoryImage = multer({
  storage: process.env.CLOUDINARY_CLOUD_NAME ? memoryStorage : createStorage('categories'),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for category images
    files: 1
  },
  fileFilter: imageFilter
}).single('image');

// Prescription upload configuration
const uploadPrescription = multer({
  storage: process.env.CLOUDINARY_CLOUD_NAME ? memoryStorage : createStorage('prescriptions'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for prescriptions
    files: 3
  },
  fileFilter: documentFilter
}).array('prescriptions', 3);

// User avatar upload configuration
const uploadAvatar = multer({
  storage: process.env.CLOUDINARY_CLOUD_NAME ? memoryStorage : createStorage('avatars'),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for avatars
    files: 1
  },
  fileFilter: imageFilter
}).single('avatar');

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          success: false,
          message: 'File size too large. Maximum allowed size is 5MB.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(413).json({
          success: false,
          message: 'Too many files. Maximum allowed is 5 files.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name for file upload.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + error.message
        });
    }
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next();
};

// Cleanup uploaded files helper
const cleanupFiles = (files) => {
  if (!files) return;
  
  const fileArray = Array.isArray(files) ? files : [files];
  
  fileArray.forEach(file => {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
};

// Validate file type middleware
const validateFileType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files || [req.file];
    
    for (const file of files) {
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        cleanupFiles(files);
        return res.status(400).json({
          success: false,
          message: `File type ${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
        });
      }
    }
    
    next();
  };
};

// File upload wrapper to handle errors gracefully
const createUploadMiddleware = (uploadFunction) => {
  return (req, res, next) => {
    uploadFunction(req, res, (error) => {
      if (error) {
        return handleUploadError(error, req, res, next);
      }
      next();
    });
  };
};

module.exports = {
  uploadDrugImages: createUploadMiddleware(uploadDrugImages),
  uploadCategoryImage: createUploadMiddleware(uploadCategoryImage),
  uploadPrescription: createUploadMiddleware(uploadPrescription),
  uploadAvatar: createUploadMiddleware(uploadAvatar),
  handleUploadError,
  cleanupFiles,
  validateFileType,
  imageFilter,
  documentFilter
};