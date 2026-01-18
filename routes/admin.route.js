const express = require('express');
const adminController = require('../controllers/admin.controller');
const { protect, adminOnly, validateInput, sanitizeInput } = require('../middlewares');

const router = express.Router();

// Middleware global - Seuls les admins peuvent accéder
router.use(protect);
router.use(adminOnly);
router.use(validateInput);
router.use(sanitizeInput);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Gestion des utilisateurs
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// Gestion des contenus
router.get('/content', adminController.getAllContent);

module.exports = router;