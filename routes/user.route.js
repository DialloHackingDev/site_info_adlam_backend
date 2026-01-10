const express = require('express');
const authController = require('../controllers/user.controller');
const { validateInput, sanitizeInput } = require('../middlewares');

const router = express.Router();

// Middleware global
router.use(validateInput);
router.use(sanitizeInput);

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;