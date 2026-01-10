const Like = require('../models/like.model');
const Article = require('../models/article.model');
const Comment = require('../models/comment.model');

// Liker/Unliker un article
exports.toggleArticleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Vérifier que l'article existe et est publié
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

    const result = await Like.toggleLike(req.user._id, 'Article', id, ipAddress);

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

// Liker/Unliker un commentaire
exports.toggleCommentLike = async (req, res) => {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Vérifier que le commentaire existe et est approuvé
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Commentaire non trouvé'
      });
    }

    if (comment.status !== 'approved') {
      return res.status(400).json({
        status: 'error',
        message: 'Impossible de liker un commentaire non approuvé'
      });
    }

    const result = await Like.toggleLike(req.user._id, 'Comment', id, ipAddress);

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

// Obtenir les likes d'un utilisateur
exports.getUserLikes = async (req, res) => {
  try {
    const { targetType } = req.query;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const likes = await Like.getUserLikes(req.user._id, targetType, {
      limit: parseInt(limit),
      skip
    });

    const total = await Like.countDocuments({
      user: req.user._id,
      ...(targetType && { targetType })
    });

    res.status(200).json({
      status: 'success',
      results: likes.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: { likes }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Vérifier si l'utilisateur a liké des éléments spécifiques
exports.checkUserLikes = async (req, res) => {
  try {
    const { targets } = req.body; // [{ type: 'Article', id: 'articleId' }, ...]

    if (!Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Liste des éléments à vérifier requise'
      });
    }

    const userLikes = await Like.checkUserLikes(req.user._id, targets);

    res.status(200).json({
      status: 'success',
      data: { userLikes }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir le contenu populaire basé sur les likes
exports.getPopularContent = async (req, res) => {
  try {
    const { type = 'Article', days = 7, limit = 10 } = req.query;

    if (!['Article', 'Comment'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Type doit être Article ou Comment'
      });
    }

    const popularContent = await Like.getPopularContent(
      type,
      parseInt(days),
      parseInt(limit)
    );

    res.status(200).json({
      status: 'success',
      results: popularContent.length,
      data: { popularContent }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les statistiques de likes pour un élément
exports.getLikeStats = async (req, res) => {
  try {
    const { type, id } = req.params;

    if (!['Article', 'Comment'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Type doit être Article ou Comment'
      });
    }

    const stats = await Like.getLikeStats(type, id);
    const likeStats = stats[0] || {
      totalLikes: 0,
      recentLikes: 0,
      firstLike: null,
      lastLike: null
    };

    res.status(200).json({
      status: 'success',
      data: { stats: likeStats }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les statistiques globales des likes (Admin)
exports.getGlobalLikeStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(days));

    const stats = await Like.aggregate([
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: '$targetType',
                totalLikes: { $sum: 1 },
                uniqueUsers: { $addToSet: '$user' }
              }
            },
            {
              $project: {
                targetType: '$_id',
                totalLikes: 1,
                uniqueUsers: { $size: '$uniqueUsers' }
              }
            }
          ],
          recentStats: [
            {
              $match: {
                createdAt: { $gte: dateLimit }
              }
            },
            {
              $group: {
                _id: '$targetType',
                recentLikes: { $sum: 1 },
                uniqueUsers: { $addToSet: '$user' }
              }
            },
            {
              $project: {
                targetType: '$_id',
                recentLikes: 1,
                uniqueUsers: { $size: '$uniqueUsers' }
              }
            }
          ],
          dailyStats: [
            {
              $match: {
                createdAt: { $gte: dateLimit }
              }
            },
            {
              $group: {
                _id: {
                  date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                  type: '$targetType'
                },
                count: { $sum: 1 }
              }
            },
            {
              $sort: { '_id.date': 1 }
            }
          ]
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        period: `${days} derniers jours`,
        stats: stats[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};