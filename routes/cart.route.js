const express = require('express');
const cartController = require('../controllers/cart.controller');
const {
  protect,
  validateInput,
  validateAddToCart,
  validateUpdateQuantity,
  sanitizeInput
} = require('../middlewares');

const router = express.Router();

// Middleware global - authentification requise pour toutes les routes
router.use(protect);
router.use(validateInput);
router.use(sanitizeInput);

// Routes du panier
router.get('/', cartController.getCart);
router.get('/count', cartController.getCartCount);
router.post('/add', validateAddToCart, cartController.addToCart);
router.patch('/sync', cartController.syncCartPrices);
router.patch('/:ebookId', validateUpdateQuantity, cartController.updateCartItem);
router.delete('/clear', cartController.clearCart);
router.delete('/:ebookId', cartController.removeFromCart);

module.exports = router;