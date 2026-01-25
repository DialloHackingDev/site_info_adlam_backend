const express = require('express');
const multer = require('multer');
const adminController = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middlewares');
const { uploadArticleImage, uploadEbookFiles } = require('../config/cloudinary');

const router = express.Router();

// Middleware pour toutes les routes admin
router.use(protect);
router.use(adminOnly);

// Routes dashboard
router.get('/stats', adminController.getDashboardStats);

// Routes articles
router.post('/articles', multer({ storage: multer.memoryStorage() }).single('coverImage'), adminController.createArticle);
router.put('/articles/:id', multer({ storage: multer.memoryStorage() }).single('coverImage'), adminController.updateArticle);
router.delete('/articles/:id', adminController.deleteArticle);

// Routes e-books
router.post('/ebooks', multer({ storage: multer.memoryStorage() }).fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'pdfFile', maxCount: 1 }
]), adminController.createEbook);

router.put('/ebooks/:id', multer({ storage: multer.memoryStorage() }).fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'pdfFile', maxCount: 1 }
]), adminController.updateEbook);

router.delete('/ebooks/:id', adminController.deleteEbook);

module.exports = router;

module.exports = router;