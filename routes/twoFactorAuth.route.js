const express = require('express');
const twoFactorAuthController = require('../controllers/twoFactorAuth.controller');
const { protect, adminOnly } = require('../middlewares');

const router = express.Router();

// Routes protégées (nécessitent authentification)
router.use(protect);
router.use(adminOnly); // 2FA uniquement pour les admins

router.post('/enable', twoFactorAuthController.enable2FA);
router.post('/verify', twoFactorAuthController.verify2FA);
router.post('/disable', twoFactorAuthController.disable2FA);

// Route publique pour vérifier le token lors du login
router.post('/verify-login', twoFactorAuthController.verifyLogin2FA);

module.exports = router;
