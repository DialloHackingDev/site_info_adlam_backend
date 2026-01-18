const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  ebook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ebook',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  
  // Montants
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  fees: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'GNF',
    enum: ['GNF', 'USD', 'EUR']
  },
  
  // Statut de la commande
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  
  // Informations de paiement
  paymentIntentId: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'canceled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: null
  },
  
  // Dates importantes
  paidAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  
  // Métadonnées
  customerEmail: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  
  // Informations de livraison (pour les e-books, c'est le téléchargement)
  downloadLinks: [{
    ebook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ebook'
    },
    downloadUrl: String,
    expiresAt: Date,
    downloadCount: {
      type: Number,
      default: 0
    },
    maxDownloads: {
      type: Number,
      default: 5
    }
  }]
}, {
  timestamps: true
});

// Index pour les recherches
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ paymentIntentId: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

// Middleware pour générer le numéro de commande
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.orderNumber = `ADL-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Méthodes d'instance
orderSchema.methods.markAsPaid = function(paymentMethod = null) {
  this.paymentStatus = 'succeeded';
  this.status = 'processing';
  this.paidAt = new Date();
  if (paymentMethod) {
    this.paymentMethod = paymentMethod;
  }
  return this.save();
};

orderSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

orderSchema.methods.markAsFailed = function() {
  this.paymentStatus = 'failed';
  this.status = 'failed';
  return this.save();
};

orderSchema.methods.addDownloadLink = function(ebookId, downloadUrl, expiresAt) {
  const existingLink = this.downloadLinks.find(
    link => link.ebook.toString() === ebookId.toString()
  );

  if (existingLink) {
    existingLink.downloadUrl = downloadUrl;
    existingLink.expiresAt = expiresAt;
  } else {
    this.downloadLinks.push({
      ebook: ebookId,
      downloadUrl,
      expiresAt
    });
  }

  return this.save();
};

orderSchema.methods.incrementDownload = function(ebookId) {
  const link = this.downloadLinks.find(
    link => link.ebook.toString() === ebookId.toString()
  );

  if (link) {
    link.downloadCount += 1;
    return this.save();
  }

  throw new Error('Lien de téléchargement non trouvé');
};

// Méthodes statiques
orderSchema.statics.createFromCart = async function(cart, user, paymentIntentId) {
  const orderItems = cart.items.map(item => ({
    ebook: item.ebook._id || item.ebook,
    title: item.ebook.title,
    author: item.ebook.author,
    price: item.price,
    quantity: item.quantity
  }));

  const subtotal = cart.totalAmount;
  const fees = 0; // Pas de frais supplémentaires pour l'instant
  const total = subtotal + fees;

  const order = await this.create({
    user: user._id,
    items: orderItems,
    subtotal,
    fees,
    total,
    currency: cart.currency,
    paymentIntentId,
    customerEmail: user.email,
    customerName: user.name
  });

  return order;
};

orderSchema.statics.findByPaymentIntent = function(paymentIntentId) {
  return this.findOne({ paymentIntentId });
};

orderSchema.statics.getUserOrders = function(userId, options = {}) {
  const { page = 1, limit = 10, status } = options;
  const skip = (page - 1) * limit;
  
  const query = { user: userId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('items.ebook', 'title slug coverImage')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);
};

module.exports = mongoose.model('Order', orderSchema);