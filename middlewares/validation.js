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
 * Validation spécifique pour les commentaires
 */
exports.validateComment = (req, res, next) => {
  const { content, articleId, parentCommentId } = req.body;

  // Validation du contenu
  if (!content || typeof content !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Le contenu du commentaire est obligatoire'
    });
  }

  if (content.trim().length < 3) {
    return res.status(400).json({
      status: 'error',
      message: 'Le commentaire doit contenir au moins 3 caractères'
    });
  }

  if (content.length > 1000) {
    return res.status(400).json({
      status: 'error',
      message: 'Le commentaire ne peut pas dépasser 1000 caractères'
    });
  }

  // Validation de l'ID de l'article
  if (!articleId || typeof articleId !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'ID de l\'article requis'
    });
  }

  // Validation de l'ID du commentaire parent (optionnel)
  if (parentCommentId && typeof parentCommentId !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'ID du commentaire parent invalide'
    });
  }

  next();
};

/**
 * Validation pour la mise à jour de commentaire
 */
exports.validateCommentUpdate = (req, res, next) => {
  const { content } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Le contenu du commentaire est obligatoire'
    });
  }

  if (content.trim().length < 3) {
    return res.status(400).json({
      status: 'error',
      message: 'Le commentaire doit contenir au moins 3 caractères'
    });
  }

  if (content.length > 1000) {
    return res.status(400).json({
      status: 'error',
      message: 'Le commentaire ne peut pas dépasser 1000 caractères'
    });
  }

  next();
};

/**
 * Validation pour les actions de modération
 */
exports.validateModerationAction = (req, res, next) => {
  const { action } = req.body;

  if (!action || !['approve', 'reject', 'spam'].includes(action)) {
    return res.status(400).json({
      status: 'error',
      message: 'Action doit être approve, reject ou spam'
    });
  }

  next();
};

/**
 * Validation pour la vérification des likes
 */
exports.validateLikeCheck = (req, res, next) => {
  const { targets } = req.body;

  if (!Array.isArray(targets)) {
    return res.status(400).json({
      status: 'error',
      message: 'Targets doit être un tableau'
    });
  }

  if (targets.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Au moins un élément à vérifier requis'
    });
  }

  if (targets.length > 100) {
    return res.status(400).json({
      status: 'error',
      message: 'Maximum 100 éléments par requête'
    });
  }

  // Valider chaque target
  for (const target of targets) {
    if (!target.type || !target.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Chaque target doit avoir un type et un id'
      });
    }

    if (!['Article', 'Comment'].includes(target.type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Type doit être Article ou Comment'
      });
    }
  }

  next();
};

/**
 * Validation spécifique pour les e-books
 */
exports.validateEbook = (req, res, next) => {
  const { title, description, author, price, category } = req.body;

  // Validation des champs requis
  if (!title || !description || !author || !category) {
    return res.status(400).json({
      status: 'error',
      message: 'Titre, description, auteur et catégorie sont obligatoires'
    });
  }

  // Validation des types
  if (typeof title !== 'string' || typeof description !== 'string' || 
      typeof author !== 'string' || typeof category !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Types de données invalides'
    });
  }

  // Validation du prix
  if (price !== undefined) {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Le prix doit être un nombre positif'
      });
    }
  }

  // Validation des catégories autorisées
  const allowedCategories = ['litterature', 'histoire', 'education', 'culture', 'science', 'religion', 'enfants'];
  if (!allowedCategories.includes(category)) {
    return res.status(400).json({
      status: 'error',
      message: 'Catégorie non valide'
    });
  }

  // Validation de la longueur
  if (title.trim().length > 200) {
    return res.status(400).json({
      status: 'error',
      message: 'Le titre ne peut pas dépasser 200 caractères'
    });
  }

  if (description.trim().length > 2000) {
    return res.status(400).json({
      status: 'error',
      message: 'La description ne peut pas dépasser 2000 caractères'
    });
  }

  if (author.trim().length > 100) {
    return res.status(400).json({
      status: 'error',
      message: 'Le nom de l\'auteur ne peut pas dépasser 100 caractères'
    });
  }

  next();
};

/**
 * Validation pour la mise à jour d'e-books
 */
exports.validateEbookUpdate = (req, res, next) => {
  const { title, description, author, price, category } = req.body;

  // Validation des types si fournis
  if (title && typeof title !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Le titre doit être une chaîne de caractères'
    });
  }

  if (description && typeof description !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'La description doit être une chaîne de caractères'
    });
  }

  if (author && typeof author !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'L\'auteur doit être une chaîne de caractères'
    });
  }

  if (category) {
    if (typeof category !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'La catégorie doit être une chaîne de caractères'
      });
    }

    const allowedCategories = ['litterature', 'histoire', 'education', 'culture', 'science', 'religion', 'enfants'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        status: 'error',
        message: 'Catégorie non valide'
      });
    }
  }

  // Validation du prix
  if (price !== undefined) {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Le prix doit être un nombre positif'
      });
    }
  }

  // Validation de la longueur
  if (title && title.trim().length > 200) {
    return res.status(400).json({
      status: 'error',
      message: 'Le titre ne peut pas dépasser 200 caractères'
    });
  }

  if (description && description.trim().length > 2000) {
    return res.status(400).json({
      status: 'error',
      message: 'La description ne peut pas dépasser 2000 caractères'
    });
  }

  if (author && author.trim().length > 100) {
    return res.status(400).json({
      status: 'error',
      message: 'Le nom de l\'auteur ne peut pas dépasser 100 caractères'
    });
  }

  next();
};