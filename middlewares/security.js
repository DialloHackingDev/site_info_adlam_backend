/**
 * Middleware de validation Content-Type pour prévenir CSRF
 */
exports.validateContentType = (req, res, next) => {
  // Ignorer la validation pour les uploads de fichiers (multipart/form-data)
  if (req.is('multipart/form-data')) {
    return next();
  }
  
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    return res.status(400).json({
      status: 'error',
      message: 'Content-Type doit être application/json'
    });
  }
  next();
};

/**
 * Middleware de limitation de taille des requêtes
 */
exports.limitRequestSize = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > parseSize(maxSize)) {
      return res.status(413).json({
        status: 'error',
        message: 'Requête trop volumineuse'
      });
    }
    next();
  };
};

/**
 * Middleware de nettoyage des données
 */
exports.sanitizeInput = (req, res, next) => {
  // Nettoyer les chaînes de caractères
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.trim();
  };

  // Nettoyer récursivement un objet
  const sanitizeObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return sanitizeString(obj);
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * Utilitaire pour parser la taille
 */
function parseSize(size) {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };

  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmg]?b)$/);
  if (!match) return 0;

  const [, num, unit] = match;
  return parseFloat(num) * (units[unit] || 1);
}