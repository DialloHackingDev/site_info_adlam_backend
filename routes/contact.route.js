const express = require('express');
const contactController = require('../controllers/contact.controller');
const { validateInput, sanitizeInput } = require('../middlewares');

const { contactLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.use(validateInput);
router.use(sanitizeInput);

// Route pour envoyer un message de contact
router.post('/', contactLimiter, contactController.sendMessage);

module.exports = router;