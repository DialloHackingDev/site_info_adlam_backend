const express = require('express');
const likeController = require('../controllers/like.controller');
const {
  protect,
  adminOnly,
  validateInput,
  validateLikeCheck,
  sanitizeInput
} = require('../middlewares');

const router = express.Router();

// Middleware global
router.use(validateInput);
router.use(sanitizeInput);

// Routes publiques
router.get('/popular', likeController.getPopularContent);
router.get('/stats/:type/:id', likeController.getLikeStats);

// Routes protégées (authentification requise)
router.use(protect);

// Actions de like
router.patch('/article/:id', likeController.toggleArticleLike);
router.patch('/comment/:id', likeController.toggleCommentLike);

// Gestion des likes utilisateur
router.get('/user', likeController.getUserLikes);
router.post('/check', validateLikeCheck, likeController.checkUserLikes);

// Routes admin uniquement
router.get('/admin/stats', adminOnly, likeController.getGlobalLikeStats);

module.exports = router;