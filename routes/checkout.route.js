const express = require('express');
const checkoutController = require('../controllers/checkout.controller');
const webhookController = require('../controllers/webhook.controller');
const {
  protect,
  validateInput,
  validatePaymentConfirmation,
  sanitizeInput
} = require('../middlewares');

const router = express.Router();

// Webhook Stripe (DOIT être avant les autres middlewares pour le raw body)
router.post('/webhook', express.raw({ type: 'application/json' }), webhookController.handleStripeWebhook);

// Middleware global pour les autres routes
router.use(protect);
router.use(validateInput);
router.use(sanitizeInput);

// Routes de checkout
router.post('/create-session', checkoutController.createCheckoutSession);
router.post('/confirm-payment', validatePaymentConfirmation, checkoutController.confirmPayment);

// Routes des commandes
router.get('/orders', checkoutController.getUserOrders);
router.get('/orders/:orderId', checkoutController.getOrder);
router.get('/orders/:orderId/download/:ebookId', checkoutController.downloadEbook);

module.exports = router;