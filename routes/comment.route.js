const express = require('express');
const commentController = require('../controllers/comment.controller');
const {
  protect,
  optionalAuth,
  adminOnly,
  validateInput,
  validateComment,
  validateCommentUpdate,
  validateModerationAction,
  sanitizeInput,
  anonymousSession,
  sanitizeAnonymousInput,
  validateAnonymousComment
} = require('../middlewares');

const router = express.Router();

// Middleware global
router.use(validateInput);
router.use(sanitizeInput);
router.use(anonymousSession);

// Routes publiques avec authentification optionnelle
router.get('/article/:articleId', optionalAuth, commentController.getArticleComments);
router.get('/:commentId/replies', optionalAuth, commentController.getCommentReplies);

// Création de commentaires (public avec auth optionnelle)
router.post('/', optionalAuth, sanitizeAnonymousInput, validateAnonymousComment, commentController.createComment);

// Likes des commentaires (public avec auth optionnelle)
router.patch('/:id/like', optionalAuth, commentController.toggleCommentLike);

// Signalement (public)
router.post('/:id/report', commentController.reportComment);

// Routes admin uniquement
router.patch('/:id', protect, adminOnly, validateCommentUpdate, commentController.updateComment);
router.delete('/:id', protect, adminOnly, commentController.deleteComment);
router.get('/moderation', protect, adminOnly, commentController.getModerationQueue);
router.patch('/:id/moderate', protect, adminOnly, validateModerationAction, commentController.moderateComment);

module.exports = router;