const express = require('express');
const documentController = require('../controllers/document.controller');
const { protect, adminOnly, optionalAuth, validateInput, sanitizeInput } = require('../middlewares');

const router = express.Router();

// Middleware global
router.use(validateInput);
router.use(sanitizeInput);

// Routes publiques
router.get('/', optionalAuth, documentController.getAllDocuments);
router.get('/recent', documentController.getRecentDocuments);
router.get('/featured', documentController.getFeaturedDocuments);
router.get('/category/:category', documentController.getDocumentsByCategory);
router.get('/type/:type', documentController.getDocumentsByType);
router.get('/:slug', optionalAuth, documentController.getDocumentBySlug);
router.get('/:id/download', optionalAuth, documentController.downloadDocument);

// Routes admin
router.use(protect);
router.use(adminOnly);

router.post('/', documentController.createDocument);
router.put('/:id', documentController.updateDocument);
router.delete('/:id', documentController.deleteDocument);
router.patch('/:id/featured', documentController.toggleFeatured);
router.get('/admin/stats', documentController.getDocumentStats);

module.exports = router;