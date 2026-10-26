const Order = require('../models/order.model');
const { StripeService } = require('../config/stripe');

// Webhook Stripe pour traiter les événements de paiement
exports.handleStripeWebhook = async (req, res) => {
  let event;

  try {
    // Construire l'événement depuis le payload et la signature
    const signature = req.headers['stripe-signature'];
    event = StripeService.constructWebhookEvent(req.body, signature);
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Webhook signature invalide'
    });
  }


  try {
    // Traiter les différents types d'événements
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;

      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object);
        break;

      default:
    }

    res.status(200).json({ received: true });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur traitement webhook'
    });
  }
};

// Traiter un paiement réussi
async function handlePaymentSucceeded(paymentIntent) {
  try {
    
    const order = await Order.findByPaymentIntent(paymentIntent.id);
    if (!order) {
      return;
    }

    // Éviter le double traitement
    if (order.paymentStatus === 'succeeded') {
      return;
    }

    // Marquer la commande comme payée
    await order.markAsPaid(paymentIntent.payment_method_types?.[0]);
    
    // Générer les liens de téléchargement
    await generateDownloadLinks(order);
    
    // Marquer comme complétée
    await order.markAsCompleted();

    // Vider le panier de l'acheteur
    const Cart = require('../models/cart.model');
    const cart = await Cart.findOne({ user: order.user });
    if (cart) {
      await cart.clear();
    }
    
    // Mettre à jour les statistiques des e-books
    await updateEbookStats(order);

    
    // TODO: Envoyer un email de confirmation à l'utilisateur
    // await sendOrderConfirmationEmail(order);
    
  } catch (error) {
    console.error('Erreur webhook Stripe:', error.message);
    throw error; // Réponse 500 : Stripe renverra l'événement
  }
}

// Traiter un paiement échoué
async function handlePaymentFailed(paymentIntent) {
  try {
    
    const order = await Order.findByPaymentIntent(paymentIntent.id);
    if (!order) {
      return;
    }

    // Marquer la commande comme échouée
    await order.markAsFailed();
    
    
    // TODO: Envoyer un email d'échec de paiement
    // await sendPaymentFailedEmail(order);
    
  } catch (error) {
    console.error('Erreur webhook Stripe:', error.message);
  }
}

// Traiter un paiement annulé
async function handlePaymentCanceled(paymentIntent) {
  try {
    
    const order = await Order.findByPaymentIntent(paymentIntent.id);
    if (!order) {
      return;
    }

    // Marquer la commande comme échouée
    order.paymentStatus = 'canceled';
    order.status = 'failed';
    await order.save();
    
    
  } catch (error) {
    console.error('Erreur webhook Stripe:', error.message);
  }
}

// Traiter une contestation de charge
async function handleChargeDispute(charge) {
  try {
    
    // TODO: Implémenter la gestion des contestations
    // - Notifier les administrateurs
    // - Marquer la commande comme contestée
    // - Préparer les documents de défense
    
  } catch (error) {
    console.error('Erreur webhook Stripe:', error.message);
  }
}

// Fonctions utilitaires (réutilisées du checkout controller)
async function generateDownloadLinks(order) {
  const EbookFileService = require('../services/ebook-file.service');
  const Ebook = require('../models/ebook.model');
  
  for (const item of order.items) {
    const ebook = await Ebook.findById(item.ebook);
    if (ebook && ebook.pdfFilePublicId) {
      const downloadUrl = EbookFileService.generateSecureDownloadUrl(ebook._id);
      
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await order.addDownloadLink(item.ebook, downloadUrl, expiresAt);
    }
  }
}

async function updateEbookStats(order) {
  const Ebook = require('../models/ebook.model');
  
  for (const item of order.items) {
    const ebook = await Ebook.findById(item.ebook);
    if (ebook) {
      await ebook.recordSale(item.price * item.quantity);
    }
  }
}