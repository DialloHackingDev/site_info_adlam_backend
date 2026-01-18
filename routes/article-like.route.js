const express = require('express');
const articleLikeController = require('../controllers/article-like.controller');
const { optionalAuth, validateInput, sanitizeInput, anonymousSession } = require('../middlewares');

const router = express.Router();

// Middleware global
router.use(validateInput);
router.use(sanitizeInput);
router.use(anonymousSession);

// Routes publiques avec authentification optionnelle
router.patch('/:id/like', optionalAuth, articleLikeController.toggleArticleLike);
router.get('/:id/like-status', optionalAuth, articleLikeController.getArticleLikeStatus);

module.exports = router;