const express = require('express');
const authController = require('../controllers/user.controller');
const { protect } = require('../middlewares');

const router = express.Router();

// Routes sans middlewares pour tester
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);

module.exports = router;