const express = require('express');
const authController = require('../controllers/user.controller');
const { protect } = require('../middlewares');
const { authLimiter, registerLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/register', registerLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', protect, authController.getMe);

module.exports = router;