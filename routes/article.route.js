const express = require('express');
const articleController = require('../controllers/article.controller');
const {
  protect,
  optionalAuth,
  adminOnly,
  validateInput,
  validateArticle,
  validateArticleUpdate,
  validateLikeAction,
  sanitizeInput,
  uploadCoverImage,
  uploadOptionalImage
} = require('../middlewares');

const router = express.Router();

// Middleware global pour ce router
router.use(validateInput);
router.use(sanitizeInput);

// Routes publiques
router.get('/recent', articleController.getRecentArticles);
router.get('/featured', articleController.getFeaturedArticles);
router.get('/popular', articleController.getPopularArticles);
router.get('/category/:category', articleController.getArticlesByCategory);

// Routes avec authentification optionnelle
router.get('/', optionalAuth, articleController.getAllArticles);
router.get('/slug/:slug', optionalAuth, articleController.getArticleBySlug);

// Routes protégées (authentification requise)
router.use(protect);

// Liker un article (utilisateurs connectés)
router.patch('/:id/like', articleController.toggleLike);

// Routes admin uniquement
router.post('/', adminOnly, uploadCoverImage, validateArticle, articleController.createArticle);
router.get('/stats', adminOnly, articleController.getArticleStats);
router.get('/:id', adminOnly, articleController.getArticleById);
router.patch('/:id', adminOnly, uploadOptionalImage, validateArticleUpdate, articleController.updateArticle);
router.patch('/:id/featured', adminOnly, articleController.toggleFeatured);
router.patch('/:id/published', adminOnly, articleController.togglePublished);
router.patch('/:id/schedule', adminOnly, articleController.scheduleArticle);
router.patch('/:id/unschedule', adminOnly, articleController.unscheduleArticle);
router.delete('/:id', adminOnly, articleController.deleteArticle);

module.exports = router;