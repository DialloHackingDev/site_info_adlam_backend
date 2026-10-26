const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  ebook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ebook',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'GNF',
    enum: ['GNF', 'USD', 'EUR']
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
cartSchema.index({ 'items.ebook': 1 });

// Middleware pour calculer les totaux automatiquement
cartSchema.pre('save', function() {
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  this.totalAmount = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  this.lastUpdated = new Date();
});

// Méthodes d'instance
cartSchema.methods.addItem = async function(ebookId, price, quantity = 1) {
  const existingItemIndex = this.items.findIndex(
    item => item.ebook.toString() === ebookId.toString()
  );

  if (existingItemIndex > -1) {
    // Mettre à jour la quantité si l'item existe déjà
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].price = price; // Mettre à jour le prix au cas où
  } else {
    // Ajouter un nouvel item
    this.items.push({
      ebook: ebookId,
      quantity,
      price
    });
  }

  return this.save();
};

cartSchema.methods.removeItem = async function(ebookId) {
  this.items = this.items.filter(
    item => item.ebook.toString() !== ebookId.toString()
  );
  return this.save();
};

cartSchema.methods.updateItemQuantity = async function(ebookId, quantity) {
  const itemIndex = this.items.findIndex(
    item => item.ebook.toString() === ebookId.toString()
  );

  if (itemIndex > -1) {
    if (quantity <= 0) {
      // Supprimer l'item si quantité <= 0
      this.items.splice(itemIndex, 1);
    } else {
      this.items[itemIndex].quantity = quantity;
    }
    return this.save();
  }
  
  throw new Error('Item non trouvé dans le panier');
};

cartSchema.methods.clear = async function() {
  this.items = [];
  return this.save();
};

cartSchema.methods.getPopulatedCart = async function() {
  await this.populate({
    path: 'items.ebook',
    select: 'title slug author price discountPrice discountEndDate coverImage status'
  });
  return this;
};

// Méthodes statiques
cartSchema.statics.findOrCreateCart = async function(userId) {
  let cart = await this.findOne({ user: userId });
  
  if (!cart) {
    cart = await this.create({ user: userId, items: [] });
  }
  
  return cart;
};

cartSchema.statics.getCartWithItems = async function(userId) {
  const cart = await this.findOne({ user: userId })
    .populate({
      path: 'items.ebook',
      select: 'title slug author price discountPrice discountEndDate coverImage status'
    });
  
  if (!cart) {
    return await this.create({ user: userId, items: [] });
  }
  
  return cart;
};

// Méthode pour nettoyer les items avec des e-books supprimés ou non disponibles
cartSchema.methods.cleanInvalidItems = async function() {
  const validItems = [];
  
  for (const item of this.items) {
    // Vérifier si l'ebook existe et est publié
    if (item.ebook && typeof item.ebook === 'object' && item.ebook.status === 'published') {
      // Mettre à jour le prix si nécessaire (une promo expirée ne s'applique plus)
      const currentPrice = item.ebook.getEffectivePrice() || 0;
      
      if (item.price !== currentPrice) {
        item.price = currentPrice;
      }
      
      validItems.push(item);
    }
  }
  
  this.items = validItems;
  return this.save();
};

module.exports = mongoose.model('Cart', cartSchema);