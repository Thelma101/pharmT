const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRE || '7d') => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
    issuer: 'pharmacy-api',
    audience: 'pharmacy-app'
  });
};

// Generate access token for user
const generateAccessToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified
  };
  
  return generateToken(payload, process.env.JWT_EXPIRE || '7d');
};

// Generate refresh token
const generateRefreshToken = (user) => {
  const payload = {
    id: user._id,
    type: 'refresh'
  };
  
  return generateToken(payload, '30d');
};

// Generate password reset token
const generatePasswordResetToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    type: 'password_reset',
    timestamp: Date.now()
  };
  
  return generateToken(payload, '1h');
};

// Generate email verification token
const generateEmailVerificationToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    type: 'email_verification',
    timestamp: Date.now()
  };
  
  return generateToken(payload, '24h');
};

// Verify token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'pharmacy-api',
      audience: 'pharmacy-app'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Decode token without verification (useful for expired tokens)
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    throw new Error('Invalid token format');
  }
};

// Check if token is expired
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

// Get token expiration date
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

// Get time until token expires (in minutes)
const getTokenTimeToExpiry = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeLeft = decoded.exp - currentTime;
    
    return Math.max(0, Math.floor(timeLeft / 60)); // Return minutes
  } catch (error) {
    return 0;
  }
};

// Extract user ID from token
const getUserIdFromToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded && decoded.id ? decoded.id : null;
  } catch (error) {
    return null;
  }
};

// Validate token format
const isValidTokenFormat = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
};

// Create token response object
const createTokenResponse = (user, includeRefreshToken = false) => {
  const accessToken = generateAccessToken(user);
  const tokenExpiration = getTokenExpiration(accessToken);
  
  const response = {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRE || '7d',
    expiresAt: tokenExpiration,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isEmailVerified: user.isEmailVerified
    }
  };
  
  if (includeRefreshToken) {
    response.refreshToken = generateRefreshToken(user);
  }
  
  return response;
};

module.exports = {
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  getTokenTimeToExpiry,
  getUserIdFromToken,
  isValidTokenFormat,
  createTokenResponse
};