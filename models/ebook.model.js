const mongoose = require('mongoose');
const SlugService = require('../services/slug.service');

const ebookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  author: {
    type: String,
    required: true,
    maxlength: 100
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  currency: {
    type: String,
    default: 'GNF',
    enum: ['GNF', 'USD', 'EUR']
  },
  // Fichiers
  coverImage: {
    type: String,
    required: true
  },
  coverImagePublicId: {
    type: String,
    required: true
  },
  pdfFile: {
    type: String,
    required: true
  },
  pdfFilePublicId: {
    type: String,
    required: true
  },
  // Métadonnées du livre
  pageCount: {
    type: Number,
    default: 0
  },
  fileSize: {
    type: Number, // en bytes
    default: 0
  },
  language: {
    type: String,
    default: 'pular',
    enum: ['pular', 'french', 'english', 'arabic']
  },
  category: {
    type: String,
    required: true,
    enum: ['litterature', 'histoire', 'education', 'culture', 'science', 'religion', 'enfants']
  },
  tags: [{
    type: String,
    lowercase: true
  }],
  // Preview
  previewPages: {
    type: Number,
    default: 10,
    min: 5,
    max: 50
  },
  previewUrl: {
    type: String,
    default: null
  },
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
  sales: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
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
  },
  // Promotion
  discountPrice: {
    type: Number,
    default: null,
    min: 0
  },
  discountEndDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index pour les recherches et performances
ebookSchema.index({ title: 'text', description: 'text', author: 'text', tags: 'text' });
ebookSchema.index({ status: 1, publishedAt: -1 });
ebookSchema.index({ category: 1, status: 1 });
ebookSchema.index({ slug: 1 });
ebookSchema.index({ price: 1, status: 1 });
ebookSchema.index({ featured: 1, status: 1 });

// Middleware pour générer le slug automatiquement
ebookSchema.pre('save', async function(next) {
  // Générer le slug si nouveau ou titre modifié
  if (this.isNew || this.isModified('title')) {
    if (!this.slug || this.isModified('title')) {
      this.slug = await SlugService.generateUniqueSlug(this.title, this._id);
    }
  }
  
  // Définir publishedAt si le statut passe à published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Calculer le prix effectif (avec réduction si applicable)
  this.effectivePrice = this.getEffectivePrice();
  
  next();
});

// Méthodes d'instance
ebookSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

ebookSchema.methods.incrementDownloads = function() {
  this.downloads += 1;
  return this.save();
};

ebookSchema.methods.recordSale = function(amount) {
  this.sales += 1;
  this.revenue += amount;
  return this.save();
};

ebookSchema.methods.getEffectivePrice = function() {
  if (this.discountPrice && this.discountEndDate && new Date() <= this.discountEndDate) {
    return this.discountPrice;
  }
  return this.price;
};

ebookSchema.methods.isOnSale = function() {
  return this.discountPrice && 
         this.discountEndDate && 
         new Date() <= this.discountEndDate &&
         this.discountPrice < this.price;
};

ebookSchema.methods.getPublicData = function() {
  const ebook = this.toObject();
  // Supprimer les données sensibles pour l'API publique
  delete ebook.pdfFilePublicId;
  delete ebook.coverImagePublicId;
  
  // Ajouter les données calculées
  ebook.effectivePrice = this.getEffectivePrice();
  ebook.onSale = this.isOnSale();
  
  return ebook;
};

ebookSchema.methods.toggleFeatured = function() {
  this.featured = !this.featured;
  return this.save();
};

// Méthodes statiques
ebookSchema.statics.getPublished = function(options = {}) {
  const { 
    category, 
    limit = 12, 
    skip = 0, 
    sort = { publishedAt: -1 },
    priceRange = null,
    featured = null
  } = options;
  
  const query = { status: 'published' };
  
  if (category && category !== 'all') {
    query.category = category;
  }
  
  if (priceRange) {
    query.price = { $gte: priceRange.min, $lte: priceRange.max };
  }
  
  if (featured !== null) {
    query.featured = featured;
  }
  
  return this.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

ebookSchema.statics.getFeatured = function(limit = 6) {
  return this.find({ 
    status: 'published', 
    featured: true 
  })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

ebookSchema.statics.getRecent = function(limit = 8) {
  return this.find({ status: 'published' })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .select('title slug author price discountPrice discountEndDate coverImage category rating');
};

ebookSchema.statics.getBestSellers = function(limit = 10, days = 30) {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  
  return this.find({ 
    status: 'published',
    publishedAt: { $gte: dateLimit }
  })
    .sort({ sales: -1, downloads: -1 })
    .limit(limit);
};

ebookSchema.statics.getByCategory = function(category, options = {}) {
  const { limit = 12, skip = 0, sort = { publishedAt: -1 } } = options;
  
  return this.find({ 
    status: 'published',
    category 
  })
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

ebookSchema.statics.searchEbooks = function(searchTerm, options = {}) {
  const { 
    category, 
    limit = 12, 
    skip = 0,
    priceRange = null
  } = options;
  
  const query = {
    status: 'published',
    $text: { $search: searchTerm }
  };
  
  if (category && category !== 'all') {
    query.category = category;
  }
  
  if (priceRange) {
    query.price = { $gte: priceRange.min, $lte: priceRange.max };
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .skip(skip);
};

ebookSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$revenue' },
        totalSales: { $sum: '$sales' },
        totalDownloads: { $sum: '$downloads' }
      }
    }
  ]);
};

ebookSchema.statics.getCategoryStats = function() {
  return this.aggregate([
    { $match: { status: 'published' } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$revenue' },
        totalSales: { $sum: '$sales' },
        avgPrice: { $avg: '$price' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('Ebook', ebookSchema);