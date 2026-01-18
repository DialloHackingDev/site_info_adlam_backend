const Cart = require('../models/cart.model');
const Order = require('../models/order.model');
const Ebook = require('../models/ebook.model');
const { StripeService } = require('../config/stripe');
const EbookFileService = require('../services/ebook-file.service');

// Créer une session de checkout
exports.createCheckoutSession = async (req, res) => {
  try {
    // Récupérer le panier de l'utilisateur
    const cart = await Cart.getCartWithItems(req.user._id);
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Panier vide'
      });
    }

    // Nettoyer et valider les items
    await cart.cleanInvalidItems();
    
    if (cart.items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Aucun item valide dans le panier'
      });
    }

    // Créer le PaymentIntent Stripe
    const paymentIntent = await StripeService.createPaymentIntent(
      cart.totalAmount,
      cart.currency,
      {
        userId: req.user._id.toString(),
        userEmail: req.user.email,
        itemCount: cart.totalItems.toString()
      }
    );

    // Créer la commande
    const order = await Order.createFromCart(cart, req.user, paymentIntent.id);

    res.status(200).json({
      status: 'success',
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          total: order.total,
          currency: order.currency
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Confirmer le paiement
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        status: 'error',
        message: 'PaymentIntent ID requis'
      });
    }

    // Récupérer le PaymentIntent depuis Stripe
    const paymentIntent = await StripeService.getPaymentIntent(paymentIntentId);
    
    // Trouver la commande correspondante
    const order = await Order.findByPaymentIntent(paymentIntentId);
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Commande non trouvée'
      });
    }

    // Vérifier que c'est bien la commande de l'utilisateur
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Non autorisé'
      });
    }

    // Vérifier le statut du paiement
    if (paymentIntent.status === 'succeeded') {
      // Marquer la commande comme payée
      await order.markAsPaid(paymentIntent.payment_method_types?.[0]);
      
      // Générer les liens de téléchargement
      await generateDownloadLinks(order);
      
      // Marquer la commande comme complétée
      await order.markAsCompleted();
      
      // Vider le panier
      const cart = await Cart.findOne({ user: req.user._id });
      if (cart) {
        await cart.clear();
      }

      // Mettre à jour les statistiques des e-books
      await updateEbookStats(order);

      res.status(200).json({
        status: 'success',
        message: 'Paiement confirmé',
        data: { 
          order: {
            id: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            total: order.total
          }
        }
      });
    } else {
      // Marquer la commande comme échouée
      await order.markAsFailed();
      
      res.status(400).json({
        status: 'error',
        message: 'Paiement non réussi',
        data: { paymentStatus: paymentIntent.status }
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les commandes de l'utilisateur
exports.getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const orders = await Order.getUserOrders(req.user._id, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    const total = await Order.countDocuments({
      user: req.user._id,
      ...(status && { status })
    });

    res.status(200).json({
      status: 'success',
      results: orders.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: { orders }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir une commande spécifique
exports.getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('items.ebook', 'title slug author coverImage');

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Commande non trouvée'
      });
    }

    // Vérifier que c'est bien la commande de l'utilisateur
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Non autorisé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { order }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Télécharger un e-book acheté
exports.downloadEbook = async (req, res) => {
  try {
    const { orderId, ebookId } = req.params;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Commande non trouvée'
      });
    }

    // Vérifier les permissions
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Non autorisé'
      });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Commande non complétée'
      });
    }

    // Vérifier que l'e-book fait partie de la commande
    const orderItem = order.items.find(
      item => item.ebook.toString() === ebookId
    );

    if (!orderItem) {
      return res.status(404).json({
        status: 'error',
        message: 'E-book non trouvé dans cette commande'
      });
    }

    // Trouver le lien de téléchargement
    let downloadLink = order.downloadLinks.find(
      link => link.ebook.toString() === ebookId
    );

    if (!downloadLink || new Date() > downloadLink.expiresAt) {
      // Générer un nouveau lien de téléchargement
      const ebook = await Ebook.findById(ebookId);
      if (!ebook) {
        return res.status(404).json({
          status: 'error',
          message: 'E-book non trouvé'
        });
      }

      const downloadUrl = EbookFileService.generateSecureDownloadUrl(
        ebook.pdfFilePublicId,
        24 * 60 * 60 // 24 heures
      );

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await order.addDownloadLink(ebookId, downloadUrl, expiresAt);
      
      downloadLink = order.downloadLinks.find(
        link => link.ebook.toString() === ebookId
      );
    }

    // Vérifier les limites de téléchargement
    if (downloadLink.downloadCount >= downloadLink.maxDownloads) {
      return res.status(429).json({
        status: 'error',
        message: 'Limite de téléchargements atteinte'
      });
    }

    // Incrémenter le compteur de téléchargements
    await order.incrementDownload(ebookId);

    res.status(200).json({
      status: 'success',
      data: {
        downloadUrl: downloadLink.downloadUrl,
        expiresAt: downloadLink.expiresAt,
        remainingDownloads: downloadLink.maxDownloads - downloadLink.downloadCount - 1
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Fonctions utilitaires
async function generateDownloadLinks(order) {
  for (const item of order.items) {
    const ebook = await Ebook.findById(item.ebook);
    if (ebook && ebook.pdfFilePublicId) {
      const downloadUrl = EbookFileService.generateSecureDownloadUrl(
        ebook.pdfFilePublicId,
        24 * 60 * 60 // 24 heures
      );
      
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await order.addDownloadLink(item.ebook, downloadUrl, expiresAt);
    }
  }
}

async function updateEbookStats(order) {
  for (const item of order.items) {
    const ebook = await Ebook.findById(item.ebook);
    if (ebook) {
      await ebook.recordSale(item.price * item.quantity);
    }
  }
}