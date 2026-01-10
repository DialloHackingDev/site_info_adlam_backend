const Article = require('../models/article.model');

// Créer un article
exports.createArticle = async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      category,
      tags,
      status,
      coverImage,
      metaTitle,
      metaDescription,
      keywords,
      scheduledAt
    } = req.body;

    const articleData = {
      title,
      content,
      category,
      author: req.user._id,
      excerpt,
      tags: Array.isArray(tags) ? tags : [],
      status: status || 'draft',
      coverImage,
      metaTitle,
      metaDescription,
      keywords: Array.isArray(keywords) ? keywords : []
    };

    if (scheduledAt && status === 'scheduled') {
      articleData.scheduledAt = new Date(scheduledAt);
    }

    const article = await Article.create(articleData);
    await article.populate('author', 'name email');

    res.status(201).json({
      status: 'success',
      data: { article }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Un article avec ce titre existe déjà'
      });
    }
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir tous les articles (avec filtres)
exports.getAllArticles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      status,
      search,
      sort = 'publishedAt',
      order = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;

    let query = {};
    
    // Filtres
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (status) {
      query.status = status;
    } else if (!req.user || req.user.role !== 'admin') {
      // Les non-admins ne voient que les articles publiés
      query.status = 'published';
    }

    let articles;
    let total;

    if (search) {
      // Recherche textuelle
      articles = await Article.searchArticles(search, {
        category,
        limit: parseInt(limit),
        skip
      });
      total = await Article.countDocuments({
        ...query,
        $text: { $search: search }
      });
    } else {
      // Requête normale
      articles = await Article.find(query)
        .populate('author', 'name email')
        .sort({ [sort]: sortOrder })
        .limit(parseInt(limit))
        .skip(skip);
      
      total = await Article.countDocuments(query);
    }

    res.status(200).json({
      status: 'success',
      results: articles.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: { articles }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir un article par slug
exports.getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const article = await Article.findOne({ slug })
      .populate('author', 'name email role');

    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Article non trouvé'
      });
    }

    // Vérifier les permissions pour les articles non publiés
    if (article.status !== 'published' && 
        (!req.user || (req.user._id.toString() !== article.author._id.toString() && req.user.role !== 'admin'))) {
      return res.status(403).json({
        status: 'error',
        message: 'Accès non autorisé'
      });
    }

    // Incrémenter les vues (seulement pour les articles publiés)
    if (article.status === 'published') {
      await article.incrementViews();
    }

    res.status(200).json({
      status: 'success',
      data: { article }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir un article par ID
exports.getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id)
      .populate('author', 'name email role');

    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Article non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { article }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Mettre à jour un article
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Article non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && article.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Non autorisé à modifier cet article'
      });
    }

    const updatedArticle = await Article.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('author', 'name email');

    res.status(200).json({
      status: 'success',
      data: { article: updatedArticle }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Supprimer un article
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Article non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && article.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Non autorisé à supprimer cet article'
      });
    }

    await Article.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Article supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les articles récents (pour la page d'accueil)
exports.getRecentArticles = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const articles = await Article.getRecent(parseInt(limit));

    res.status(200).json({
      status: 'success',
      results: articles.length,
      data: { articles }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les articles par catégorie
exports.getArticlesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const articles = await Article.getPublished({
      category,
      limit: parseInt(limit),
      skip: (page - 1) * limit
    });

    const total = await Article.countDocuments({
      status: 'published',
      category
    });

    res.status(200).json({
      status: 'success',
      results: articles.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: { articles }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Liker/Unliker un article
exports.toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'like' ou 'unlike'

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Article non trouvé'
      });
    }

    if (article.status !== 'published') {
      return res.status(400).json({
        status: 'error',
        message: 'Impossible de liker un article non publié'
      });
    }

    const increment = action === 'like';
    await article.toggleLike(increment);

    res.status(200).json({
      status: 'success',
      data: {
        likes: article.likes,
        action
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};