const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    enum: ['Article', 'Comment'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType'
  },
  // Métadonnées optionnelles
  ipAddress: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index composé pour garantir l'unicité (un utilisateur ne peut liker qu'une fois)
likeSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });
likeSchema.index({ targetType: 1, targetId: 1 });
likeSchema.index({ user: 1, createdAt: -1 });

// Méthodes statiques
likeSchema.statics.toggleLike = async function(userId, targetType, targetId, ipAddress = null) {
  try {
    // Vérifier si le like existe déjà
    const existingLike = await this.findOne({
      user: userId,
      targetType,
      targetId
    });

    const targetModel = mongoose.model(targetType);
    const target = await targetModel.findById(targetId);

    if (!target) {
      throw new Error(`${targetType} non trouvé`);
    }

    if (existingLike) {
      // Supprimer le like (unlike)
      await this.findByIdAndDelete(existingLike._id);
      await target.toggleLike(false); // Décrémenter
      
      return {
        action: 'unliked',
        likesCount: target.likes,
        userHasLiked: false
      };
    } else {
      // Ajouter le like
      await this.create({
        user: userId,
        targetType,
        targetId,
        ipAddress
      });
      await target.toggleLike(true); // Incrémenter
      
      return {
        action: 'liked',
        likesCount: target.likes,
        userHasLiked: true
      };
    }
  } catch (error) {
    if (error.code === 11000) {
      // Erreur de duplicata, probablement une condition de course
      throw new Error('Action déjà effectuée');
    }
    throw error;
  }
};

likeSchema.statics.getUserLikes = function(userId, targetType = null, options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  const query = { user: userId };
  if (targetType) {
    query.targetType = targetType;
  }
  
  return this.find(query)
    .populate('targetId')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

likeSchema.statics.checkUserLikes = async function(userId, targets) {
  // targets: [{ type: 'Article', id: 'articleId' }, ...]
  const likes = await this.find({
    user: userId,
    $or: targets.map(target => ({
      targetType: target.type,
      targetId: target.id
    }))
  });

  // Retourner un map pour un accès rapide
  const likeMap = {};
  likes.forEach(like => {
    const key = `${like.targetType}_${like.targetId}`;
    likeMap[key] = true;
  });

  return likeMap;
};

likeSchema.statics.getPopularContent = function(targetType, days = 7, limit = 10) {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);

  return this.aggregate([
    {
      $match: {
        targetType,
        createdAt: { $gte: dateLimit }
      }
    },
    {
      $group: {
        _id: '$targetId',
        likesCount: { $sum: 1 },
        lastLiked: { $max: '$createdAt' }
      }
    },
    {
      $lookup: {
        from: targetType.toLowerCase() + 's',
        localField: '_id',
        foreignField: '_id',
        as: 'content'
      }
    },
    { $unwind: '$content' },
    {
      $match: {
        'content.status': 'published' // Seulement le contenu publié
      }
    },
    { $sort: { likesCount: -1, lastLiked: -1 } },
    { $limit: limit },
    {
      $project: {
        content: 1,
        likesCount: 1,
        lastLiked: 1
      }
    }
  ]);
};

likeSchema.statics.getLikeStats = function(targetType, targetId) {
  return this.aggregate([
    {
      $match: {
        targetType,
        targetId: new mongoose.Types.ObjectId(targetId)
      }
    },
    {
      $group: {
        _id: null,
        totalLikes: { $sum: 1 },
        recentLikes: {
          $sum: {
            $cond: [
              {
                $gte: [
                  '$createdAt',
                  new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24h
                ]
              },
              1,
              0
            ]
          }
        },
        firstLike: { $min: '$createdAt' },
        lastLike: { $max: '$createdAt' }
      }
    }
  ]);
};

module.exports = mongoose.model('Like', likeSchema);