const mongoose = require('mongoose');

const anonymousLikeSchema = new mongoose.Schema({
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
  ipAddress: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Index pour éviter les doublons et optimiser les requêtes
anonymousLikeSchema.index({ targetType: 1, targetId: 1, ipAddress: 1, sessionId: 1 }, { unique: true });
anonymousLikeSchema.index({ targetType: 1, targetId: 1 });

// Méthodes statiques
anonymousLikeSchema.statics.toggleLike = async function(targetType, targetId, ipAddress, sessionId, userAgent) {
  try {
    const existingLike = await this.findOne({
      targetType,
      targetId,
      ipAddress,
      sessionId
    });

    if (existingLike) {
      // Supprimer le like
      await this.deleteOne({ _id: existingLike._id });
      return { action: 'unliked', liked: false };
    } else {
      // Ajouter le like
      await this.create({
        targetType,
        targetId,
        ipAddress,
        sessionId,
        userAgent
      });
      return { action: 'liked', liked: true };
    }
  } catch (error) {
    if (error.code === 11000) {
      // Doublon détecté, considérer comme un unlike
      await this.deleteOne({ targetType, targetId, ipAddress, sessionId });
      return { action: 'unliked', liked: false };
    }
    throw error;
  }
};

anonymousLikeSchema.statics.getLikesCount = function(targetType, targetId) {
  return this.countDocuments({ targetType, targetId });
};

anonymousLikeSchema.statics.checkUserLike = function(targetType, targetId, ipAddress, sessionId) {
  return this.findOne({ targetType, targetId, ipAddress, sessionId });
};

module.exports = mongoose.model('AnonymousLike', anonymousLikeSchema);