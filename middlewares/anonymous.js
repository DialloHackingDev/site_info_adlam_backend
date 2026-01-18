const crypto = require('crypto');

/**
 * Middleware pour gérer les sessions anonymes
 * Génère un ID de session unique pour les visiteurs non connectés
 */
exports.anonymousSession = (req, res, next) => {
  // Si pas de session ID dans les headers ou cookies, en créer un
  if (!req.sessionID && !req.headers['x-session-id'] && !req.cookies.anonymousSession) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    // Définir le cookie de session (7 jours)
    res.cookie('anonymousSession', sessionId, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    req.sessionID = sessionId;
  } else {
    // Utiliser la session existante
    req.sessionID = req.headers['x-session-id'] || req.cookies.anonymousSession || req.sessionID;
  }
  
  next();
};

/**
 * Middleware pour nettoyer les données d'entrée et prévenir les attaques
 */
exports.sanitizeAnonymousInput = (req, res, next) => {
  if (req.body.authorName) {
    req.body.authorName = req.body.authorName.trim().substring(0, 50);
  }
  
  if (req.body.authorEmail) {
    req.body.authorEmail = req.body.authorEmail.trim().toLowerCase().substring(0, 100);
  }
  
  if (req.body.content) {
    req.body.content = req.body.content.trim().substring(0, 1000);
  }
  
  next();
};

/**
 * Middleware de validation pour les commentaires anonymes
 */
exports.validateAnonymousComment = (req, res, next) => {
  const { content, authorName, authorEmail, articleId } = req.body;
  
  // Si utilisateur non connecté, valider les champs anonymes
  if (!req.user) {
    if (!authorName || authorName.trim().length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Le nom doit contenir au moins 2 caractères'
      });
    }
    
    if (!authorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) {
      return res.status(400).json({
        status: 'error',
        message: 'Email invalide'
      });
    }
  }
  
  if (!content || content.trim().length < 3) {
    return res.status(400).json({
      status: 'error',
      message: 'Le commentaire doit contenir au moins 3 caractères'
    });
  }
  
  if (!articleId) {
    return res.status(400).json({
      status: 'error',
      message: 'ID de l\'article requis'
    });
  }
  
  next();
};

module.exports = {
  anonymousSession: exports.anonymousSession,
  sanitizeAnonymousInput: exports.sanitizeAnonymousInput,
  validateAnonymousComment: exports.validateAnonymousComment
};