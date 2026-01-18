const Cart = require('../models/cart.model');
const Ebook = require('../models/ebook.model');

// Obtenir le panier de l'utilisateur
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.getCartWithItems(req.user._id);
    
    // Nettoyer les items invalides
    await cart.cleanInvalidItems();

    res.status(200).json({
      status: 'success',
      data: { cart }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Ajouter un item au panier
exports.addToCart = async (req, res) => {
  try {
    const { ebookId, quantity = 1 } = req.body;

    // Vérifier que l'e-book existe et est disponible
    const ebook = await Ebook.findById(ebookId);
    if (!ebook) {
      return res.status(404).json({
        status: 'error',
        message: 'E-book non trouvé'
      });
    }

    if (ebook.status !== 'published') {
      return res.status(400).json({
        status: 'error',
        message: 'E-book non disponible'
      });
    }

    // Obtenir ou créer le panier
    const cart = await Cart.findOrCreateCart(req.user._id);

    // Vérifier si l'item est déjà dans le panier
    const existingItem = cart.items.find(
      item => item.ebook.toString() === ebookId
    );

    if (existingItem) {
      return res.status(400).json({
        status: 'error',
        message: 'Cet e-book est déjà dans votre panier'
      });
    }

    // Ajouter l'item avec le prix effectif
    const effectivePrice = ebook.getEffectivePrice();
    await cart.addItem(ebookId, effectivePrice, parseInt(quantity));

    // Récupérer le panier mis à jour avec les détails des e-books
    const updatedCart = await Cart.getCartWithItems(req.user._id);

    res.status(200).json({
      status: 'success',
      message: 'E-book ajouté au panier',
      data: { cart: updatedCart }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Supprimer un item du panier
exports.removeFromCart = async (req, res) => {
  try {
    const { ebookId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Panier non trouvé'
      });
    }

    await cart.removeItem(ebookId);

    // Récupérer le panier mis à jour
    const updatedCart = await Cart.getCartWithItems(req.user._id);

    res.status(200).json({
      status: 'success',
      message: 'E-book retiré du panier',
      data: { cart: updatedCart }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Mettre à jour la quantité d'un item
exports.updateCartItem = async (req, res) => {
  try {
    const { ebookId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantité invalide'
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Panier non trouvé'
      });
    }

    await cart.updateItemQuantity(ebookId, parseInt(quantity));

    // Récupérer le panier mis à jour
    const updatedCart = await Cart.getCartWithItems(req.user._id);

    res.status(200).json({
      status: 'success',
      message: 'Quantité mise à jour',
      data: { cart: updatedCart }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Vider le panier
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Panier non trouvé'
      });
    }

    await cart.clear();

    res.status(200).json({
      status: 'success',
      message: 'Panier vidé',
      data: { cart }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir le nombre d'items dans le panier (pour l'UI)
exports.getCartCount = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    const count = cart ? cart.totalItems : 0;

    res.status(200).json({
      status: 'success',
      data: { count }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Synchroniser les prix du panier (utile après des changements de prix)
exports.syncCartPrices = async (req, res) => {
  try {
    const cart = await Cart.getCartWithItems(req.user._id);
    
    let hasChanges = false;
    for (const item of cart.items) {
      if (item.ebook && item.ebook.getEffectivePrice) {
        const currentPrice = item.ebook.getEffectivePrice();
        if (item.price !== currentPrice) {
          item.price = currentPrice;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      await cart.save();
    }

    res.status(200).json({
      status: 'success',
      message: hasChanges ? 'Prix synchronisés' : 'Aucune mise à jour nécessaire',
      data: { cart }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};