const User = require('../models/users.model');
const twoFactorAuthService = require('../services/twoFactorAuth.service');
const bcrypt = require('bcryptjs');

// Activer 2FA
exports.enable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    // Générer le secret 2FA
    const { secret, otpauthUrl } = twoFactorAuthService.generateSecret(user.email);
    
    // Générer le QR code
    const qrCode = await twoFactorAuthService.generateQRCode(otpauthUrl);

    // Sauvegarder le secret temporairement (non activé)
    user.twoFactorSecret = secret;
    user.twoFactorEnabled = false;
    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        secret,
        qrCode
      }
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de l\'activation du 2FA'
    });
  }
};

// Vérifier et confirmer 2FA
exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id);

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({
        status: 'error',
        message: '2FA non configuré'
      });
    }

    // Vérifier le token
    const isValid = twoFactorAuthService.verifyToken(user.twoFactorSecret, token);

    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Code invalide'
      });
    }

    // Activer 2FA
    user.twoFactorEnabled = true;
    
    // Générer codes de backup
    const backupCodes = twoFactorAuthService.generateBackupCodes();
    user.twoFactorBackupCodes = backupCodes.map(code => bcrypt.hashSync(code, 10));
    
    await user.save();

    res.status(200).json({
      status: 'success',
      message: '2FA activé avec succès',
      data: {
        backupCodes
      }
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la vérification'
    });
  }
};

// Désactiver 2FA
exports.disable2FA = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Mot de passe incorrect'
      });
    }

    // Désactiver 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: '2FA désactivé avec succès'
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la désactivation'
    });
  }
};

// Vérifier token 2FA lors du login
exports.verifyLogin2FA = async (req, res) => {
  try {
    const { userId, token, useBackupCode } = req.body;
    const user = await User.findById(userId);

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({
        status: 'error',
        message: '2FA non activé'
      });
    }

    let isValid = false;

    if (useBackupCode) {
      // Vérifier code de backup
      for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
        if (bcrypt.compareSync(token, user.twoFactorBackupCodes[i])) {
          isValid = true;
          // Supprimer le code utilisé
          user.twoFactorBackupCodes.splice(i, 1);
          await user.save();
          break;
        }
      }
    } else {
      // Vérifier token TOTP
      isValid = twoFactorAuthService.verifyToken(user.twoFactorSecret, token);
    }

    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Code invalide'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Authentification réussie'
    });
  } catch (error) {
    console.error('Verify login 2FA error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la vérification'
    });
  }
};
