const mongoose = require('mongoose');
const SlugService = require('../services/slug.service');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    maxlength: 300
  },
  coverImage: {
    type: String,
    default: null
  },
  coverImagePublicId: {
    type: String,
    default: null
  },
  category: {
    type: String,
    required: true,
    enum: ['litterature', 'histoire', 'education', 'culture', 'science', 'religion']
  },
  tags: [{
    type: String,
    lowercase: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'scheduled'],
    default: 'draft'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publishedAt: {
    type: Date,
    default: null
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  // SEO Meta
  metaTitle: {
    type: String,
    maxlength: 60
  },
  metaDescription: {
    type: String,
    maxlength: 160
  },
  keywords: [{
    type: String
  }],
  readingTime: {
    type: Number, // en minutes
    default: 0
  },
  // Statistiques avancées
  lastViewedAt: {
    type: Date,
    default: null
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index pour les recherches
articleSchema.index({ title: 'text', content: 'text', tags: 'text' });
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ category: 1, status: 1 });
articleSchema.index({ slug: 1 });

// Middleware pour générer le slug automatiquement
articleSchema.pre('save', async function(next) {
  try {
    // Calculer le temps de lecture (250 mots par minute)
    if (this.isModified('content')) {
      const wordCount = this.content.split(/\s+/).length;
      this.readingTime = Math.ceil(wordCount / 250);
    }
    
    // Générer l'extrait automatiquement si pas fourni
    if (this.isModified('content') && !this.excerpt) {
      this.excerpt = this.content.replace(/<[^>]*>/g, '').substring(0, 300) + '...';
    }
    
    // Définir publishedAt si le statut passe à published
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
      this.publishedAt = new Date();
    }
    
    // Nettoyer scheduledAt si le statut n'est plus scheduled
    if (this.isModified('status') && this.status !== 'scheduled') {
      this.scheduledAt = null;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Méthodes d'instance
articleSchema.methods.incrementViews = function() {
  this.views += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

articleSchema.methods.toggleLike = function(increment = true) {
  this.likes += increment ? 1 : -1;
  if (this.likes < 0) this.likes = 0;
  return this.save();
};

articleSchema.methods.toggleFeatured = function() {
  this.featured = !this.featured;
  return this.save();
};

articleSchema.methods.canBePublished = function() {
  return this.title && this.content && this.category;
};

articleSchema.methods.getPublicData = function() {
  const article = this.toObject();
  // Supprimer les données sensibles pour l'API publique
  delete article.coverImagePublicId;
  return article;
};

// Méthodes statiques
articleSchema.statics.getPublished = function(options = {}) {
  const { category, limit = 10, skip = 0, sort = { publishedAt: -1 }, featured = null } = options;
  
  const query = { status: 'published' };
  if (category && category !== 'all') {
    query.category = category;
  }
  if (featured !== null) {
    query.featured = featured;
  }
  
  return this.find(query)
    .populate('author', 'name email')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

articleSchema.statics.getRecent = function(limit = 5) {
  return this.find({ status: 'published' })
    .populate('author', 'name email')
    .sort({ publishedAt: -1 })
    .limit(limit)
    .select('title slug excerpt coverImage category publishedAt views likes readingTime featured');
};

articleSchema.statics.getFeatured = function(limit = 3) {
  return this.find({ status: 'published', featured: true })
    .populate('author', 'name email')
    .sort({ publishedAt: -1 })
    .limit(limit);
};

articleSchema.statics.getPopular = function(limit = 5, days = 7) {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  
  return this.find({ 
    status: 'published',
    publishedAt: { $gte: dateLimit }
  })
    .populate('author', 'name email')
    .sort({ views: -1, likes: -1 })
    .limit(limit);
};

articleSchema.statics.getByCategory = function(category, options = {}) {
  const { limit = 10, skip = 0 } = options;
  
  return this.find({ 
    status: 'published',
    category 
  })
    .populate('author', 'name email')
    .sort({ publishedAt: -1 })
    .limit(limit)
    .skip(skip);
};

articleSchema.statics.searchArticles = function(searchTerm, options = {}) {
  const { category, limit = 10, skip = 0 } = options;
  
  const query = {
    status: 'published',
    $text: { $search: searchTerm }
  };
  
  if (category && category !== 'all') {
    query.category = category;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('author', 'name email')
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .skip(skip);
};

articleSchema.statics.getScheduledStats = function() {
  return this.aggregate([
    { $match: { status: 'scheduled' } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        nextScheduled: { $min: '$scheduledAt' }
      }
    }
  ]);
};

articleSchema.statics.getCategoryStats = function() {
  return this.aggregate([
    { $match: { status: 'published' } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likes' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('Article', articleSchema);