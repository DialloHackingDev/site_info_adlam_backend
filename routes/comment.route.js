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
  sanitizeInput
} = require('../middlewares');

const router = express.Router();

// Middleware global
router.use(validateInput);
router.use(sanitizeInput);

// Routes publiques avec authentification optionnelle
router.get('/article/:articleId', optionalAuth, commentController.getArticleComments);
router.get('/:commentId/replies', optionalAuth, commentController.getCommentReplies);

// Routes protégées (authentification requise)
router.use(protect);

// CRUD des commentaires
router.post('/', validateComment, commentController.createComment);
router.patch('/:id', validateCommentUpdate, commentController.updateComment);
router.delete('/:id', commentController.deleteComment);

// Likes des commentaires
router.patch('/:id/like', commentController.toggleCommentLike);

// Signalement
router.post('/:id/report', commentController.reportComment);

// Routes admin uniquement
router.get('/moderation', adminOnly, commentController.getModerationQueue);
router.patch('/:id/moderate', adminOnly, validateModerationAction, commentController.moderateComment);

module.exports = router;