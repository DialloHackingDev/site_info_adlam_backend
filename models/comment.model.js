const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  // Auteur connecté (admin uniquement)
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  // Commentaires anonymes
  authorName: {
    type: String,
    required: function() { return !this.author; },
    maxlength: 50,
    trim: true
  },
  authorEmail: {
    type: String,
    required: function() { return !this.author; },
    lowercase: true,
    trim: true
  },
  isAnonymous: {
    type: Boolean,
    default: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  level: {
    type: Number,
    default: 0, // 0 = commentaire principal, 1 = réponse, 2 = réponse à une réponse (max)
    max: 2
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'spam'],
    default: 'approved' // Auto-approuvé par défaut, peut être changé en 'pending' pour modération
  },
  likes: {
    type: Number,
    default: 0
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  // Métadonnées pour la modération
  reportCount: {
    type: Number,
    default: 0
  },
  isReported: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
commentSchema.index({ article: 1, status: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, status: 1, createdAt: 1 });
commentSchema.index({ author: 1, status: 1 });

// Middleware pour valider la hiérarchie des commentaires
commentSchema.pre('save', async function(next) {
  // Définir si c'est un commentaire anonyme
  this.isAnonymous = !this.author;
  
  if (this.parentComment) {
    const parentComment = await this.constructor.findById(this.parentComment);
    
    if (!parentComment) {
      return next(new Error('Commentaire parent non trouvé'));
    }
    
    // Vérifier que l'article est le même
    if (parentComment.article.toString() !== this.article.toString()) {
      return next(new Error('Le commentaire parent doit être sur le même article'));
    }
    
    // Définir le niveau basé sur le parent
    this.level = parentComment.level + 1;
    
    // Limiter à 2 niveaux maximum
    if (this.level > 2) {
      return next(new Error('Maximum 2 niveaux de réponses autorisés'));
    }
  } else {
    this.level = 0;
  }
  
  next();
});

// Méthodes d'instance
commentSchema.methods.toggleLike = function(increment = true) {
  this.likes += increment ? 1 : -1;
  if (this.likes < 0) this.likes = 0;
  return this.save();
};

commentSchema.methods.markAsEdited = function() {
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

commentSchema.methods.report = function() {
  this.reportCount += 1;
  this.isReported = true;
  return this.save();
};

commentSchema.methods.approve = function() {
  this.status = 'approved';
  return this.save();
};

commentSchema.methods.reject = function() {
  this.status = 'rejected';
  return this.save();
};

commentSchema.methods.markAsSpam = function() {
  this.status = 'spam';
  return this.save();
};

// Méthodes statiques
commentSchema.statics.getByArticle = function(articleId, options = {}) {
  const { limit = 20, skip = 0, sort = { createdAt: -1 } } = options;
  
  return this.find({
    article: articleId,
    status: 'approved',
    parentComment: null // Seulement les commentaires principaux
  })
    .populate('author', 'name email')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

commentSchema.statics.getReplies = function(parentCommentId, options = {}) {
  const { limit = 10, sort = { createdAt: 1 } } = options;
  
  return this.find({
    parentComment: parentCommentId,
    status: 'approved'
  })
    .populate('author', 'name email')
    .sort(sort)
    .limit(limit);
};

commentSchema.statics.getCommentThread = function(articleId, options = {}) {
  const { limit = 20, skip = 0 } = options;
  
  return this.aggregate([
    {
      $match: {
        article: new mongoose.Types.ObjectId(articleId),
        status: 'approved'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'author',
        pipeline: [{ $project: { name: 1, email: 1 } }]
      }
    },
    { $unwind: '$author' },
    {
      $sort: { level: 1, createdAt: -1 }
    },
    {
      $group: {
        _id: { $ifNull: ['$parentComment', '$_id'] },
        mainComment: {
          $first: {
            $cond: [
              { $eq: ['$level', 0] },
              '$$ROOT',
              null
            ]
          }
        },
        replies: {
          $push: {
            $cond: [
              { $gt: ['$level', 0] },
              '$$ROOT',
              null
            ]
          }
        }
      }
    },
    {
      $project: {
        mainComment: 1,
        replies: {
          $filter: {
            input: '$replies',
            cond: { $ne: ['$$this', null] }
          }
        }
      }
    },
    { $sort: { 'mainComment.createdAt': -1 } },
    { $skip: skip },
    { $limit: limit }
  ]);
};

commentSchema.statics.getStats = function(articleId) {
  return this.aggregate([
    {
      $match: {
        article: new mongoose.Types.ObjectId(articleId),
        status: 'approved'
      }
    },
    {
      $group: {
        _id: null,
        totalComments: { $sum: 1 },
        totalLikes: { $sum: '$likes' },
        mainComments: {
          $sum: { $cond: [{ $eq: ['$level', 0] }, 1, 0] }
        },
        replies: {
          $sum: { $cond: [{ $gt: ['$level', 0] }, 1, 0] }
        }
      }
    }
  ]);
};

commentSchema.statics.getModerationQueue = function(options = {}) {
  const { status = 'pending', limit = 50, skip = 0 } = options;
  
  return this.find({ status })
    .populate('author', 'name email')
    .populate('article', 'title slug')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.model('Comment', commentSchema);