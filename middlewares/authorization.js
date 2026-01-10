/**
 * Middleware de restriction par rôle
 * Vérifie que l'utilisateur a les permissions nécessaires
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentification requise'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Accès interdit. Permissions insuffisantes.'
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier si l'utilisateur est admin
 */
exports.adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentification requise'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Accès réservé aux administrateurs'
    });
  }

  next();
};

/**
 * Middleware pour vérifier la propriété d'une ressource
 * Utilisé pour les articles, commentaires, etc.
 */
exports.checkOwnership = (Model, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          status: 'error',
          message: 'Ressource non trouvée'
        });
      }

      // Admin peut tout faire
      if (req.user.role === 'admin') {
        req.resource = resource;
        return next();
      }

      // Vérifier la propriété
      if (resource.author && resource.author.toString() !== req.user.id) {
        return res.status(403).json({
          status: 'error',
          message: 'Non autorisé à modifier cette ressource'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Erreur lors de la vérification des permissions'
      });
    }
  };
};