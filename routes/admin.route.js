const express = require('express');
const adminController = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middlewares');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configuration multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'coverImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Seules les images sont autorisées pour la couverture'));
      }
    } else if (file.fieldname === 'pdfFile') {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Seuls les fichiers PDF sont autorisés'));
      }
    } else {
      cb(null, true);
    }
  }
});

// Middleware pour toutes les routes admin
router.use(protect);
router.use(adminOnly);

// Routes dashboard
router.get('/stats', adminController.getDashboardStats);

// Routes articles
router.post('/articles', upload.single('coverImage'), adminController.createArticle);
router.patch('/articles/:id', upload.single('coverImage'), adminController.updateArticle);
router.delete('/articles/:id', adminController.deleteArticle);

// Routes e-books
router.post('/ebooks', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'pdfFile', maxCount: 1 }
]), adminController.createEbook);

router.patch('/ebooks/:id', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'pdfFile', maxCount: 1 }
]), adminController.updateEbook);

router.delete('/ebooks/:id', adminController.deleteEbook);

module.exports = router;