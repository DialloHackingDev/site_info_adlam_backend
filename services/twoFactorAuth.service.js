const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class TwoFactorAuthService {
  /**
   * Génère un secret 2FA pour un utilisateur
   */
  generateSecret(userEmail) {
    const secret = speakeasy.generateSecret({
      name: `Adlam (${userEmail})`,
      issuer: 'Adlam Platform'
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url
    };
  }

  /**
   * Génère un QR code pour le secret 2FA
   */
  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Vérifie un token 2FA
   */
  verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Permet une fenêtre de 2 périodes (60 secondes)
    });
  }

  /**
   * Génère un token de backup
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}

module.exports = new TwoFactorAuthService();
