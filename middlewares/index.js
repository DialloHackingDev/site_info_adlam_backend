// Authentification
const { protect, optionalAuth } = require('./auth');

// Autorisation
const { restrictTo, adminOnly, checkOwnership } = require('./authorization');

// Validation
const { 
  validateInput, 
  validateArticle, 
  validateArticleUpdate, 
  validateLikeAction 
} = require('./validation');

// Sécurité
const { 
  validateContentType, 
  limitRequestSize, 
  sanitizeInput 
} = require('./security');

module.exports = {
  // Authentification
  protect,
  optionalAuth,
  
  // Autorisation
  restrictTo,
  adminOnly,
  checkOwnership,
  
  // Validation
  validateInput,
  validateArticle,
  validateArticleUpdate,
  validateLikeAction,
  
  // Sécurité
  validateContentType,
  limitRequestSize,
  sanitizeInput
};