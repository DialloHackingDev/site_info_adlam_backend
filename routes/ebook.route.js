const express = require('express');
const ebookController = require('../controllers/ebook.controller');
const {
  protect,
  optionalAuth,
  adminOnly,
  validateInput,
  validateEbook,
  validateEbookUpdate,
  sanitizeInput,
  uploadEbookFiles,
  uploadOptionalEbookFiles
} = require('../middlewares');

const router = express.Router();

// Middleware global
router.use(validateInput);
router.use(sanitizeInput);

// Routes publiques
router.get('/recent', ebookController.getRecentEbooks);
router.get('/featured', ebookController.getFeaturedEbooks);
router.get('/bestsellers', ebookController.getBestSellers);
router.get('/category/:category', ebookController.getEbooksByCategory);

// Routes avec authentification optionnelle
router.get('/', optionalAuth, ebookController.getAllEbooks);
router.get('/slug/:slug', optionalAuth, ebookController.getEbookBySlug);
router.get('/:id', optionalAuth, ebookController.getEbookById);

// Routes protégées (authentification requise)
router.use(protect);

// Téléchargement sécurisé (après achat)
router.get('/:id/download', ebookController.generateDownloadUrl);

// Routes admin uniquement
router.post('/', adminOnly, uploadEbookFiles, validateEbook, ebookController.createEbook);
router.get('/admin/stats', adminOnly, ebookController.getEbookStats);
router.patch('/:id', adminOnly, uploadOptionalEbookFiles, validateEbookUpdate, ebookController.updateEbook);
router.patch('/:id/featured', adminOnly, ebookController.toggleFeatured);
router.delete('/:id', adminOnly, ebookController.deleteEbook);

module.exports = router;