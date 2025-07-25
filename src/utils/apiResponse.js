// Success response helper
const successResponse = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
  const response = {
    success: true,
    message,
    ...(data && { data }),
    ...(meta && { meta }),
    timestamp: new Date().toISOString()
  };

  return res.status(statusCode).json(response);
};

// Error response helper
const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    timestamp: new Date().toISOString()
  };

  return res.status(statusCode).json(response);
};

// Validation error response
const validationErrorResponse = (res, errors, message = 'Validation Error') => {
  return errorResponse(res, message, 400, errors);
};

// Not found response
const notFoundResponse = (res, resource = 'Resource') => {
  return errorResponse(res, `${resource} not found`, 404);
};

// Unauthorized response
const unauthorizedResponse = (res, message = 'Unauthorized access') => {
  return errorResponse(res, message, 401);
};

// Forbidden response
const forbiddenResponse = (res, message = 'Access forbidden') => {
  return errorResponse(res, message, 403);
};

// Created response
const createdResponse = (res, data = null, message = 'Created successfully') => {
  return successResponse(res, data, message, 201);
};

// No content response
const noContentResponse = (res, message = 'No content') => {
  return res.status(204).json({
    success: true,
    message,
    timestamp: new Date().toISOString()
  });
};

// Paginated response
const paginatedResponse = (res, data, pagination, message = 'Success') => {
  const meta = {
    pagination: {
      currentPage: pagination.page,
      totalPages: pagination.totalPages,
      totalItems: pagination.totalDocs,
      itemsPerPage: pagination.limit,
      hasNextPage: pagination.hasNextPage,
      hasPrevPage: pagination.hasPrevPage,
      nextPage: pagination.nextPage,
      prevPage: pagination.prevPage
    }
  };

  return successResponse(res, data, message, 200, meta);
};

// Custom paginated response for manual pagination
const customPaginatedResponse = (res, data, page, limit, totalItems, message = 'Success') => {
  const totalPages = Math.ceil(totalItems / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const meta = {
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalItems,
      itemsPerPage: parseInt(limit),
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  };

  return successResponse(res, data, message, 200, meta);
};

// Bad request response
const badRequestResponse = (res, message = 'Bad request', errors = null) => {
  return errorResponse(res, message, 400, errors);
};

// Conflict response
const conflictResponse = (res, message = 'Resource conflict') => {
  return errorResponse(res, message, 409);
};

// Too many requests response
const tooManyRequestsResponse = (res, message = 'Too many requests') => {
  return errorResponse(res, message, 429);
};

// Internal server error response
const internalServerErrorResponse = (res, message = 'Internal server error') => {
  return errorResponse(res, message, 500);
};

// Service unavailable response
const serviceUnavailableResponse = (res, message = 'Service unavailable') => {
  return errorResponse(res, message, 503);
};

// Custom response with additional fields
const customResponse = (res, statusCode, success, message, data = null, meta = null, errors = null) => {
  const response = {
    success,
    message,
    ...(data && { data }),
    ...(meta && { meta }),
    ...(errors && { errors }),
    timestamp: new Date().toISOString()
  };

  return res.status(statusCode).json(response);
};

// Response for file operations
const fileResponse = (res, file, message = 'File processed successfully') => {
  const data = {
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    url: file.url || `/uploads/${file.filename}`
  };

  return successResponse(res, data, message);
};

// Bulk operation response
const bulkOperationResponse = (res, results, message = 'Bulk operation completed') => {
  const data = {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };

  return successResponse(res, data, message);
};

// Health check response
const healthCheckResponse = (res, status = 'OK', checks = {}) => {
  const data = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks
  };

  const statusCode = status === 'OK' ? 200 : 503;
  return res.status(statusCode).json(data);
};

// Statistics response
const statisticsResponse = (res, stats, message = 'Statistics retrieved successfully') => {
  const data = {
    ...stats,
    generatedAt: new Date().toISOString()
  };

  return successResponse(res, data, message);
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  createdResponse,
  noContentResponse,
  paginatedResponse,
  customPaginatedResponse,
  badRequestResponse,
  conflictResponse,
  tooManyRequestsResponse,
  internalServerErrorResponse,
  serviceUnavailableResponse,
  customResponse,
  fileResponse,
  bulkOperationResponse,
  healthCheckResponse,
  statisticsResponse
};