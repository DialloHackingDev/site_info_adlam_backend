const express = require('express');
const contactController = require('../controllers/contact.controller');
const { validateInput, sanitizeInput } = require('../middlewares');

const router = express.Router();

router.use(validateInput);
router.use(sanitizeInput);

// Route pour envoyer un message de contact
router.post('/', contactController.sendMessage);

module.exports = router;