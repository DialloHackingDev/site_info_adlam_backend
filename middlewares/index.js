// Authentification
const { protect, optionalAuth } = require('./auth.middlewares');

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
  validateEbookUpdate,
  validateAddToCart,
  validateUpdateQuantity,
  validatePaymentConfirmation
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
  uploadOptionalEbookFiles,
  uploadDocumentFiles,
  uploadOptionalDocumentFiles
} = require('./upload');

// Sessions anonymes
const {
  anonymousSession,
  sanitizeAnonymousInput,
  validateAnonymousComment
} = require('./anonymous');

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
  validateAddToCart,
  validateUpdateQuantity,
  validatePaymentConfirmation,
  validateAnonymousComment,
  
  // Sécurité
  validateContentType,
  limitRequestSize,
  sanitizeInput,
  sanitizeAnonymousInput,
  
  // Upload
  uploadCoverImage,
  uploadOptionalImage,
  validateImageDimensions,
  uploadEbookFiles,
  uploadOptionalEbookFiles,
  uploadDocumentFiles,
  uploadOptionalDocumentFiles,
  
  // Sessions anonymes
  anonymousSession
};