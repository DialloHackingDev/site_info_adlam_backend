const mongoose = require('mongoose');
const SlugService = require('../services/slug.service');

const documentSchema = new mongoose.Schema({
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
  description: {
    type: String,
    maxlength: 500
  },
  content: {
    type: String,
    default: null
  },
  type: {
    type: String,
    required: true,
    enum: ['pdf', 'doc', 'image', 'video', 'audio', 'other']
  },
  category: {
    type: String,
    required: true,
    enum: ['legal', 'educational', 'cultural', 'administrative', 'historical', 'religious', 'other']
  },
  // Fichier principal
  fileUrl: {
    type: String,
    required: true
  },
  filePublicId: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number, // en bytes
    default: 0
  },
  mimeType: {
    type: String,
    required: true
  },
  // Image de prévisualisation (optionnelle)
  thumbnailUrl: {
    type: String,
    default: null
  },
  thumbnailPublicId: {
    type: String,
    default: null
  },
  // Métadonnées
  language: {
    type: String,
    default: 'pular',
    enum: ['pular', 'french', 'english', 'arabic']
  },
  tags: [{
    type: String,
    lowercase: true
  }],
  // Statut et publication
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date,
    default: null
  },
  // Statistiques
  downloads: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  // Permissions
  isPublic: {
    type: Boolean,
    default: true
  },
  allowDownload: {
    type: Boolean,
    default: true
  },
  // SEO
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
  // Gestion
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index pour les recherches
// Même raison que pour les e-books : 'language' n'est pas une langue d'analyse MongoDB
documentSchema.index(
  { title: 'text', description: 'text', tags: 'text' },
  { default_language: 'none', language_override: 'textSearchLanguage' }
);
documentSchema.index({ status: 1, publishedAt: -1 });
documentSchema.index({ category: 1, status: 1 });
documentSchema.index({ type: 1, status: 1 });

// Middleware pour générer le slug automatiquement
// Mongoose 9 : pas de callback next
documentSchema.pre('save', async function() {
  // Générer le slug si nouveau ou titre modifié (unicité vérifiée parmi les documents)
  if (this.isNew || this.isModified('title')) {
    if (!this.slug || this.isModified('title')) {
      const generated = SlugService.generateSlug(this.title);
      const baseSlug = generated === 'article' ? 'document' : generated;
      let slug = baseSlug;
      let counter = 1;
      while (await this.constructor.exists({ slug, _id: { $ne: this._id } })) {
        slug = `${baseSlug}-${counter++}`;
      }
      this.slug = slug;
    }
  }
  
  // Définir publishedAt si le statut passe à published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

// Méthodes d'instance
documentSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

documentSchema.methods.incrementDownloads = function() {
  this.downloads += 1;
  return this.save();
};

documentSchema.methods.toggleFeatured = function() {
  this.featured = !this.featured;
  return this.save();
};

documentSchema.methods.getPublicData = function() {
  const document = this.toObject();
  // Supprimer les données sensibles pour l'API publique
  delete document.filePublicId;
  delete document.thumbnailPublicId;
  return document;
};

// Méthodes statiques
documentSchema.statics.getPublished = function(options = {}) {
  const { 
    category, 
    type,
    limit = 12, 
    skip = 0, 
    sort = { publishedAt: -1 },
    featured = null
  } = options;
  
  const query = { status: 'published', isPublic: true };
  
  if (category && category !== 'all') {
    query.category = category;
  }
  
  if (type && type !== 'all') {
    query.type = type;
  }
  
  if (featured !== null) {
    query.featured = featured;
  }
  
  return this.find(query)
    .populate('createdBy', 'name email')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

documentSchema.statics.getFeatured = function(limit = 6) {
  return this.find({ 
    status: 'published', 
    featured: true,
    isPublic: true 
  })
    .populate('createdBy', 'name email')
    .sort({ publishedAt: -1 })
    .limit(limit);
};

documentSchema.statics.getRecent = function(limit = 8) {
  return this.find({ 
    status: 'published',
    isPublic: true 
  })
    .populate('createdBy', 'name email')
    .sort({ publishedAt: -1 })
    .limit(limit)
    .select('title slug description type category thumbnailUrl publishedAt views downloads featured');
};

documentSchema.statics.getByCategory = function(category, options = {}) {
  const { limit = 12, skip = 0, sort = { publishedAt: -1 } } = options;
  
  return this.find({ 
    status: 'published',
    isPublic: true,
    category 
  })
    .populate('createdBy', 'name email')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

documentSchema.statics.getByType = function(type, options = {}) {
  const { limit = 12, skip = 0, sort = { publishedAt: -1 } } = options;
  
  return this.find({ 
    status: 'published',
    isPublic: true,
    type 
  })
    .populate('createdBy', 'name email')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

documentSchema.statics.searchDocuments = function(searchTerm, options = {}) {
  const { 
    category, 
    type,
    limit = 12, 
    skip = 0
  } = options;
  
  const query = {
    status: 'published',
    isPublic: true,
    $text: { $search: searchTerm }
  };
  
  if (category && category !== 'all') {
    query.category = category;
  }
  
  if (type && type !== 'all') {
    query.type = type;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('createdBy', 'name email')
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .skip(skip);
};

documentSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalDownloads: { $sum: '$downloads' },
        totalViews: { $sum: '$views' }
      }
    }
  ]);
};

documentSchema.statics.getCategoryStats = function() {
  return this.aggregate([
    { $match: { status: 'published' } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalDownloads: { $sum: '$downloads' },
        totalViews: { $sum: '$views' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

documentSchema.statics.getTypeStats = function() {
  return this.aggregate([
    { $match: { status: 'published' } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalDownloads: { $sum: '$downloads' },
        totalViews: { $sum: '$views' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('Document', documentSchema);