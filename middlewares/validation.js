/**
 * Middleware de validation pour prévenir l'injection NoSQL
 */
exports.validateInput = (req, res, next) => {
  const validateValue = (value, fieldName) => {
    if (value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
      return res.status(400).json({
        status: 'error',
        message: `Le champ ${fieldName} ne peut pas être un objet`
      });
    }
  };

  // Valider le body
  if (req.body) {
    for (const [key, value] of Object.entries(req.body)) {
      validateValue(value, key);
    }
  }

  // Valider les query params
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      validateValue(value, key);
    }
  }

  next();
};

/**
 * Validation spécifique pour les articles
 */
exports.validateArticle = (req, res, next) => {
  const { title, content, category, tags, keywords } = req.body;

  // Validation des champs requis
  if (!title || !content || !category) {
    return res.status(400).json({
      status: 'error',
      message: 'Titre, contenu et catégorie sont obligatoires'
    });
  }

  // Validation des types
  if (typeof title !== 'string' || typeof content !== 'string' || typeof category !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Titre, contenu et catégorie doivent être des chaînes de caractères'
    });
  }

  // Validation des tableaux
  if (tags && !Array.isArray(tags)) {
    return res.status(400).json({
      status: 'error',
      message: 'Les tags doivent être un tableau'
    });
  }

  if (keywords && !Array.isArray(keywords)) {
    return res.status(400).json({
      status: 'error',
      message: 'Les mots-clés doivent être un tableau'
    });
  }

  // Validation des catégories autorisées
  const allowedCategories = ['litterature', 'histoire', 'education', 'culture', 'science', 'religion'];
  if (!allowedCategories.includes(category)) {
    return res.status(400).json({
      status: 'error',
      message: 'Catégorie non valide'
    });
  }

  next();
};

/**
 * Validation pour la mise à jour d'articles
 */
exports.validateArticleUpdate = (req, res, next) => {
  const { title, content, category, tags, keywords } = req.body;

  // Validation des types si fournis
  if (title && typeof title !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Le titre doit être une chaîne de caractères'
    });
  }

  if (content && typeof content !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Le contenu doit être une chaîne de caractères'
    });
  }

  if (category) {
    if (typeof category !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'La catégorie doit être une chaîne de caractères'
      });
    }

    const allowedCategories = ['litterature', 'histoire', 'education', 'culture', 'science', 'religion'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        status: 'error',
        message: 'Catégorie non valide'
      });
    }
  }

  if (tags && !Array.isArray(tags)) {
    return res.status(400).json({
      status: 'error',
      message: 'Les tags doivent être un tableau'
    });
  }

  if (keywords && !Array.isArray(keywords)) {
    return res.status(400).json({
      status: 'error',
      message: 'Les mots-clés doivent être un tableau'
    });
  }

  next();
};

/**
 * Validation pour les actions de like
 */
exports.validateLikeAction = (req, res, next) => {
  const { action } = req.body;

  if (!action || !['like', 'unlike'].includes(action)) {
    return res.status(400).json({
      status: 'error',
      message: 'Action doit être "like" ou "unlike"'
    });
  }

  next();
};