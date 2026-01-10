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
  sanitizeInput
} = require('../middlewares');

const router = express.Router();

// Middleware global pour ce router
router.use(validateInput);
router.use(sanitizeInput);

// Routes publiques
router.get('/recent', articleController.getRecentArticles);
router.get('/category/:category', articleController.getArticlesByCategory);

// Routes avec authentification optionnelle
router.get('/', optionalAuth, articleController.getAllArticles);
router.get('/slug/:slug', optionalAuth, articleController.getArticleBySlug);

// Routes protégées (authentification requise)
router.use(protect);

// Liker un article (utilisateurs connectés)
router.patch('/:id/like', validateLikeAction, articleController.toggleLike);

// Routes admin uniquement
router.post('/', adminOnly, validateArticle, articleController.createArticle);
router.get('/:id', adminOnly, articleController.getArticleById);
router.patch('/:id', adminOnly, validateArticleUpdate, articleController.updateArticle);
router.delete('/:id', adminOnly, articleController.deleteArticle);

module.exports = router;