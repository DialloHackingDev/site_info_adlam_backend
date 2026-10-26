const Article = require('../models/article.model');
const schedulerService = require('../services/scheduler.service');
const { deleteImage, extractPublicId } = require('../config/cloudinary');

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
      metaTitle,
      metaDescription,
      keywords,
      scheduledAt,
      featured
    } = req.body;

    const articleData = {
      title,
      content,
      category,
      author: req.user._id,
      excerpt,
      tags: Array.isArray(tags) ? tags.filter(tag => tag && tag.trim() !== '') : [],
      status: status || 'draft',
      metaTitle,
      metaDescription,
      keywords: Array.isArray(keywords) ? keywords.filter(keyword => keyword && keyword.trim() !== '') : [],
      featured: featured || false
    };

    // Gestion de l'image de couverture
    if (req.body.coverImage) {
      articleData.coverImage = req.body.coverImage;
      if (req.uploadedImagePublicId) {
        articleData.coverImagePublicId = req.uploadedImagePublicId;
      }
    }

    // Gestion de la planification
    if (scheduledAt && status === 'scheduled') {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          status: 'error',
          message: 'La date de planification doit être dans le futur'
        });
      }
      articleData.scheduledAt = scheduledDate;
    }

    const article = await Article.create(articleData);
    await article.populate('author', 'name');

    res.status(201).json({
      status: 'success',
      data: { article: article.getPublicData() }
    });
  } catch (error) {
    // Supprimer l'image uploadée en cas d'erreur
    if (req.uploadedImagePublicId) {
      try {
        await deleteImage(req.uploadedImagePublicId);
      } catch (deleteError) {
        console.error('Erreur suppression image:', deleteError);
      }
    }
    
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
    
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
      // Les non-admins ne voient que les articles publiés, quel que soit le filtre demandé
      query.status = 'published';
    } else if (status) {
      query.status = status;
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
        .populate('author', 'name')
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
    const oldImagePublicId = req.resource?.coverImagePublicId;

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

    // Normaliser les tableaux (tags et keywords)
    if (updates.tags) {
      updates.tags = Array.isArray(updates.tags) ? updates.tags : [updates.tags];
      updates.tags = updates.tags.filter(tag => tag && tag.trim() !== '');
    }
    if (updates.keywords) {
      updates.keywords = Array.isArray(updates.keywords) ? updates.keywords : [updates.keywords];
      updates.keywords = updates.keywords.filter(keyword => keyword && keyword.trim() !== '');
    }

    // Gestion de l'image de couverture
    if (req.body.coverImage && req.body.coverImage !== article.coverImage) {
      updates.coverImage = req.body.coverImage;
      if (req.uploadedImagePublicId) {
        updates.coverImagePublicId = req.uploadedImagePublicId;
        
        // Supprimer l'ancienne image
        if (oldImagePublicId) {
          try {
            await deleteImage(oldImagePublicId);
          } catch (deleteError) {
            console.error('Erreur suppression ancienne image:', deleteError);
          }
        }
      }
    }

    // Gestion de la planification
    if (updates.scheduledAt && updates.status === 'scheduled') {
      const scheduledDate = new Date(updates.scheduledAt);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          status: 'error',
          message: 'La date de planification doit être dans le futur'
        });
      }
    }

    const updatedArticle = await Article.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('author', 'name');

    res.status(200).json({
      status: 'success',
      data: { article: updatedArticle.getPublicData() }
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

    // Supprimer l'image de couverture si elle existe
    if (article.coverImagePublicId) {
      try {
        await deleteImage(article.coverImagePublicId);
      } catch (deleteError) {
        console.error('Erreur suppression image:', deleteError);
      }
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
    const ipAddress = req.ip || req.connection.remoteAddress;

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

    // Utiliser le service Like pour gérer les likes
    const Like = require('../models/like.model');
    const result = await Like.toggleLike(req.user._id, 'Article', id, ipAddress);

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Nouvelles fonctionnalités avancées

// Obtenir les articles en vedette
exports.getFeaturedArticles = async (req, res) => {
  try {
    const { limit = 3 } = req.query;
    const articles = await Article.getFeatured(parseInt(limit));

    res.status(200).json({
      status: 'success',
      results: articles.length,
      data: { articles: articles.map(article => article.getPublicData()) }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les articles populaires
exports.getPopularArticles = async (req, res) => {
  try {
    const { limit = 5, days = 7 } = req.query;
    const articles = await Article.getPopular(parseInt(limit), parseInt(days));

    res.status(200).json({
      status: 'success',
      results: articles.length,
      data: { articles: articles.map(article => article.getPublicData()) }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Basculer le statut featured d'un article
exports.toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Article non trouvé'
      });
    }

    await article.toggleFeatured();

    res.status(200).json({
      status: 'success',
      data: {
        featured: article.featured,
        message: `Article ${article.featured ? 'ajouté aux' : 'retiré des'} articles en vedette`
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Planifier un article
exports.scheduleArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({
        status: 'error',
        message: 'Date de planification requise'
      });
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'La date de planification doit être dans le futur'
      });
    }

    const article = await schedulerService.scheduleArticle(id, scheduledDate);

    res.status(200).json({
      status: 'success',
      data: { article: article.getPublicData() }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Annuler la planification
exports.unscheduleArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await schedulerService.unscheduleArticle(id);

    res.status(200).json({
      status: 'success',
      data: { article: article.getPublicData() }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les statistiques des articles
exports.getArticleStats = async (req, res) => {
  try {
    const [categoryStats, scheduledStats] = await Promise.all([
      Article.getCategoryStats(),
      Article.getScheduledStats()
    ]);

    const totalPublished = await Article.countDocuments({ status: 'published' });
    const totalDrafts = await Article.countDocuments({ status: 'draft' });
    const totalScheduled = scheduledStats[0]?.total || 0;

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalPublished,
          totalDrafts,
          totalScheduled
        },
        categoryStats,
        scheduledStats: scheduledStats[0] || { total: 0, nextScheduled: null }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Basculer le statut published/draft d'un article
exports.togglePublished = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Article non trouvé'
      });
    }

    // Basculer entre published et draft
    const newStatus = article.status === 'published' ? 'draft' : 'published';
    article.status = newStatus;
    
    // Définir publishedAt si on publie
    if (newStatus === 'published' && !article.publishedAt) {
      article.publishedAt = new Date();
    }
    
    await article.save();

    res.status(200).json({
      status: 'success',
      data: {
        article,
        message: `Article ${newStatus === 'published' ? 'publié' : 'mis en brouillon'} avec succès`
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};