const express = require('express');
const multer = require('multer');
const adminController = require('../controllers/admin.controller');
const contactController = require('../controllers/contact.controller');
const { protect } = require('../middlewares/auth.middlewares');
const { adminOnly } = require('../middlewares/authorization');
const { uploadArticleImage, uploadEbookFiles } = require('../config/cloudinary');

const router = express.Router();

// Upload en mémoire avant envoi à Cloudinary : taille plafonnée pour protéger la RAM
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 2 }
});

// Middleware pour toutes les routes admin
router.use(protect);
router.use(adminOnly);

// Routes dashboard
router.get('/stats', adminController.getDashboardStats);

// Routes utilisateurs
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Routes articles
router.post('/articles', memoryUpload.single('coverImage'), adminController.createArticle);
router.put('/articles/:id', memoryUpload.single('coverImage'), adminController.updateArticle);
router.delete('/articles/:id', adminController.deleteArticle);

// Routes e-books
router.post('/ebooks', memoryUpload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'pdfFile', maxCount: 1 }
]), adminController.createEbook);

router.put('/ebooks/:id', memoryUpload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'pdfFile', maxCount: 1 }
]), adminController.updateEbook);

router.delete('/ebooks/:id', adminController.deleteEbook);

// Messages de contact
router.get('/contact/messages', contactController.getMessages);
router.get('/contact/messages/:id', contactController.getMessage);
router.patch('/contact/messages/:id/read', contactController.markAsRead);
router.delete('/contact/messages/:id', contactController.deleteMessage);

module.exports = router;