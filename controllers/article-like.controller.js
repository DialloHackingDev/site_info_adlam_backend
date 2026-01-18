const Article = require('../models/article.model');
const Like = require('../models/like.model');
const AnonymousLike = require('../models/anonymous-like.model');

// Liker/Unliker un article (anonyme ou connecté)
exports.toggleArticleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const sessionId = req.sessionID || req.headers['x-session-id'] || 'anonymous';
    const userAgent = req.get('User-Agent');

    // Vérifier que l'article existe
    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Article non trouvé'
      });
    }

    let result;
    
    if (req.user) {
      // Utilisateur connecté (admin) - utiliser l'ancien système
      result = await Like.toggleLike(req.user._id, 'Article', id, ipAddress);
    } else {
      // Visiteur anonyme - utiliser le nouveau système
      result = await AnonymousLike.toggleLike('Article', id, ipAddress, sessionId, userAgent);
      
      // Mettre à jour le compteur dans l'article
      const likesCount = await AnonymousLike.getLikesCount('Article', id);
      await Article.findByIdAndUpdate(id, { likes: likesCount });
      
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

// Obtenir le statut de like d'un utilisateur pour un article
exports.getArticleLikeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const sessionId = req.sessionID || req.headers['x-session-id'] || 'anonymous';

    let liked = false;
    let totalLikes = 0;

    if (req.user) {
      // Utilisateur connecté
      const userLike = await Like.findOne({
        user: req.user._id,
        targetType: 'Article',
        targetId: id
      });
      liked = !!userLike;
    } else {
      // Visiteur anonyme
      const anonymousLike = await AnonymousLike.checkUserLike('Article', id, ipAddress, sessionId);
      liked = !!anonymousLike;
    }

    // Compter tous les likes (anciens + nouveaux systèmes)
    const oldLikes = await Like.countDocuments({ targetType: 'Article', targetId: id });
    const newLikes = await AnonymousLike.getLikesCount('Article', id);
    totalLikes = oldLikes + newLikes;

    res.status(200).json({
      status: 'success',
      data: {
        liked,
        totalLikes
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  toggleArticleLike: exports.toggleArticleLike,
  getArticleLikeStatus: exports.getArticleLikeStatus
};