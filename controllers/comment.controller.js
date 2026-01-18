const Comment = require('../models/comment.model');
const Article = require('../models/article.model');
const Like = require('../models/like.model');
const AnonymousLike = require('../models/anonymous-like.model');

// Créer un commentaire (anonyme ou connecté)
exports.createComment = async (req, res) => {
  try {
    const { content, articleId, parentCommentId, authorName, authorEmail } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Vérifier que l'article existe
    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Article non trouvé'
      });
    }

    // Vérifier que l'article est publié
    if (article.status !== 'published') {
      return res.status(400).json({
        status: 'error',
        message: 'Impossible de commenter un article non publié'
      });
    }

    const commentData = {
      content,
      article: articleId,
      ipAddress
    };

    // Si utilisateur connecté (admin)
    if (req.user) {
      commentData.author = req.user._id;
      commentData.isAnonymous = false;
    } else {
      // Commentaire anonyme
      if (!authorName || !authorEmail) {
        return res.status(400).json({
          status: 'error',
          message: 'Nom et email requis pour les commentaires anonymes'
        });
      }
      commentData.authorName = authorName;
      commentData.authorEmail = authorEmail;
      commentData.isAnonymous = true;
    }

    // Si c'est une réponse à un commentaire
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({
          status: 'error',
          message: 'Commentaire parent non trouvé'
        });
      }

      if (parentComment.article.toString() !== articleId) {
        return res.status(400).json({
          status: 'error',
          message: 'Le commentaire parent doit être sur le même article'
        });
      }

      commentData.parentComment = parentCommentId;
    }

    const comment = await Comment.create(commentData);
    
    // Populate selon le type de commentaire
    if (comment.author) {
      await comment.populate('author', 'name email');
    }

    res.status(201).json({
      status: 'success',
      data: { comment }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les commentaires d'un article
exports.getArticleComments = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { page = 1, limit = 20, sort = 'newest' } = req.query;

    const skip = (page - 1) * limit;
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      popular: { likes: -1, createdAt: -1 }
    };

    // Obtenir les commentaires principaux
    const comments = await Comment.getByArticle(articleId, {
      limit: parseInt(limit),
      skip,
      sort: sortOptions[sort] || sortOptions.newest
    });

    // Pour chaque commentaire principal, obtenir ses réponses
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.getReplies(comment._id);
        return {
          ...comment.toObject(),
          replies,
          repliesCount: replies.length
        };
      })
    );

    // Obtenir les statistiques
    const stats = await Comment.getStats(articleId);
    const commentStats = stats[0] || {
      totalComments: 0,
      totalLikes: 0,
      mainComments: 0,
      replies: 0
    };

    // Si utilisateur connecté, vérifier ses likes
    let userLikes = {};
    if (req.user) {
      const allCommentIds = [];
      commentsWithReplies.forEach(comment => {
        allCommentIds.push({ type: 'Comment', id: comment._id });
        comment.replies.forEach(reply => {
          allCommentIds.push({ type: 'Comment', id: reply._id });
        });
      });
      
      if (allCommentIds.length > 0) {
        userLikes = await Like.checkUserLikes(req.user._id, allCommentIds);
      }
    }

    res.status(200).json({
      status: 'success',
      results: commentsWithReplies.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: commentStats.mainComments
      },
      stats: commentStats,
      data: {
        comments: commentsWithReplies,
        userLikes
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les réponses d'un commentaire
exports.getCommentReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { limit = 10 } = req.query;

    const replies = await Comment.getReplies(commentId, {
      limit: parseInt(limit)
    });

    // Si utilisateur connecté, vérifier ses likes
    let userLikes = {};
    if (req.user && replies.length > 0) {
      const replyIds = replies.map(reply => ({ type: 'Comment', id: reply._id }));
      userLikes = await Like.checkUserLikes(req.user._id, replyIds);
    }

    res.status(200).json({
      status: 'success',
      results: replies.length,
      data: {
        replies,
        userLikes
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Modifier un commentaire
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Commentaire non trouvé'
      });
    }

    // Seuls les admins peuvent modifier les commentaires
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Seuls les administrateurs peuvent modifier les commentaires'
      });
    }

    comment.content = content;
    await comment.markAsEdited();
    
    if (comment.author) {
      await comment.populate('author', 'name email');
    }

    res.status(200).json({
      status: 'success',
      data: { comment }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Supprimer un commentaire
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Commentaire non trouvé'
      });
    }

    // Seuls les admins peuvent supprimer les commentaires
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Seuls les administrateurs peuvent supprimer les commentaires'
      });
    }

    // Supprimer les réponses si c'est un commentaire principal
    if (comment.level === 0) {
      await Comment.deleteMany({ parentComment: id });
    }

    // Supprimer les likes associés (anciens et nouveaux systèmes)
    await Like.deleteMany({ targetType: 'Comment', targetId: id });
    await AnonymousLike.deleteMany({ targetType: 'Comment', targetId: id });

    await Comment.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Commentaire supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Liker/Unliker un commentaire (anonyme ou connecté)
exports.toggleCommentLike = async (req, res) => {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const sessionId = req.sessionID || req.headers['x-session-id'] || 'anonymous';
    const userAgent = req.get('User-Agent');

    let result;
    
    if (req.user) {
      // Utilisateur connecté (admin) - utiliser l'ancien système
      result = await Like.toggleLike(req.user._id, 'Comment', id, ipAddress);
    } else {
      // Visiteur anonyme - utiliser le nouveau système
      result = await AnonymousLike.toggleLike('Comment', id, ipAddress, sessionId, userAgent);
      
      // Mettre à jour le compteur dans le commentaire
      const likesCount = await AnonymousLike.getLikesCount('Comment', id);
      await Comment.findByIdAndUpdate(id, { likes: likesCount });
      
      result.totalLikes = likesCount;
    }

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Signaler un commentaire
exports.reportComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Commentaire non trouvé'
      });
    }

    await comment.report();

    res.status(200).json({
      status: 'success',
      message: 'Commentaire signalé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Fonctions d'administration

// Obtenir la file de modération
exports.getModerationQueue = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const comments = await Comment.getModerationQueue({
      status,
      limit: parseInt(limit),
      skip
    });

    const total = await Comment.countDocuments({ status });

    res.status(200).json({
      status: 'success',
      results: comments.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: { comments }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Modérer un commentaire
exports.moderateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve', 'reject', 'spam'

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Commentaire non trouvé'
      });
    }

    switch (action) {
      case 'approve':
        await comment.approve();
        break;
      case 'reject':
        await comment.reject();
        break;
      case 'spam':
        await comment.markAsSpam();
        break;
      default:
        return res.status(400).json({
          status: 'error',
          message: 'Action non valide'
        });
    }

    res.status(200).json({
      status: 'success',
      data: { comment }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};