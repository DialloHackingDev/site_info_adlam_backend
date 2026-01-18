const express = require('express');
const shopController = require('../controllers/shop.controller');
const { protect, adminOnly, validateInput, sanitizeInput } = require('../middlewares');

const router = express.Router();

// Middleware global
router.use(validateInput);
router.use(sanitizeInput);

// Routes publiques
router.get('/', shopController.getShopInfo);

// Routes admin
router.use(protect);
router.use(adminOnly);
router.put('/', shopController.updateShop);

module.exports = router;