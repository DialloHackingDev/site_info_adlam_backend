// Authentification
const { protect, optionalAuth } = require('./auth');

// Autorisation
const { restrictTo, adminOnly, checkOwnership } = require('./authorization');

// Validation
const { 
  validateInput, 
  validateArticle, 
  validateArticleUpdate, 
  validateLikeAction,
  validateComment,
  validateCommentUpdate,
  validateModerationAction,
  validateLikeCheck,
  validateEbook,
  validateEbookUpdate
} = require('./validation');

// Sécurité
const { 
  validateContentType, 
  limitRequestSize, 
  sanitizeInput 
} = require('./security');

// Upload
const {
  uploadCoverImage,
  uploadOptionalImage,
  validateImageDimensions,
  uploadEbookFiles,
  uploadOptionalEbookFiles
} = require('./upload');

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
  validateComment,
  validateCommentUpdate,
  validateModerationAction,
  validateLikeCheck,
  validateEbook,
  validateEbookUpdate,
  
  // Sécurité
  validateContentType,
  limitRequestSize,
  sanitizeInput,
  
  // Upload
  uploadCoverImage,
  uploadOptionalImage,
  validateImageDimensions,
  uploadEbookFiles,
  uploadOptionalEbookFiles
};