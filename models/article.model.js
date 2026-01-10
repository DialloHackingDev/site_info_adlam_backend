const mongoose = require('mongoose');

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
articleSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  
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
  
  next();
});

// Méthodes d'instance
articleSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

articleSchema.methods.toggleLike = function(increment = true) {
  this.likes += increment ? 1 : -1;
  if (this.likes < 0) this.likes = 0;
  return this.save();
};

// Méthodes statiques
articleSchema.statics.getPublished = function(options = {}) {
  const { category, limit = 10, skip = 0, sort = { publishedAt: -1 } } = options;
  
  const query = { status: 'published' };
  if (category && category !== 'all') {
    query.category = category;
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
    .select('title slug excerpt coverImage category publishedAt views likes readingTime');
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

module.exports = mongoose.model('Article', articleSchema);