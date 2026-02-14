const rateLimit = require('express-rate-limit');

// Rate limiter global pour toutes les routes API
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 en dev, 100 en prod
  message: {
    status: 'error',
    message: 'Trop de requêtes, veuillez réessayer dans 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter strict pour l'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives
  message: {
    status: 'error',
    message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes'
  },
  skipSuccessfulRequests: true,
});

// Rate limiter pour l'inscription
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // 3 inscriptions par heure
  message: {
    status: 'error',
    message: 'Trop d\'inscriptions depuis cette adresse IP, veuillez réessayer dans 1 heure'
  },
});

// Rate limiter pour les commentaires
const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 commentaires
  message: {
    status: 'error',
    message: 'Trop de commentaires, veuillez réessayer dans 15 minutes'
  },
});

// Rate limiter pour le formulaire de contact
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // 3 messages
  message: {
    status: 'error',
    message: 'Trop de messages envoyés, veuillez réessayer dans 1 heure'
  },
});

// Rate limiter pour les uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20, // 20 uploads
  message: {
    status: 'error',
    message: 'Trop d\'uploads, veuillez réessayer dans 1 heure'
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
  registerLimiter,
  commentLimiter,
  contactLimiter,
  uploadLimiter
};
