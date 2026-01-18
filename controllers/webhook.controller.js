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
    console.error('❌ Erreur webhook Stripe:', error.message);
    return res.status(400).json({
      status: 'error',
      message: 'Webhook signature invalide'
    });
  }

  console.log(`📨 Webhook Stripe reçu: ${event.type}`);

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
        console.log(`⚠️ Événement non géré: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Erreur traitement webhook:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur traitement webhook'
    });
  }
};

// Traiter un paiement réussi
async function handlePaymentSucceeded(paymentIntent) {
  try {
    console.log(`✅ Paiement réussi: ${paymentIntent.id}`);
    
    const order = await Order.findByPaymentIntent(paymentIntent.id);
    if (!order) {
      console.error(`❌ Commande non trouvée pour PaymentIntent: ${paymentIntent.id}`);
      return;
    }

    // Éviter le double traitement
    if (order.paymentStatus === 'succeeded') {
      console.log(`⚠️ Paiement déjà traité pour la commande: ${order.orderNumber}`);
      return;
    }

    // Marquer la commande comme payée
    await order.markAsPaid(paymentIntent.payment_method_types?.[0]);
    
    // Générer les liens de téléchargement
    await generateDownloadLinks(order);
    
    // Marquer comme complétée
    await order.markAsCompleted();
    
    // Mettre à jour les statistiques des e-books
    await updateEbookStats(order);

    console.log(`✅ Commande ${order.orderNumber} traitée avec succès`);
    
    // TODO: Envoyer un email de confirmation à l'utilisateur
    // await sendOrderConfirmationEmail(order);
    
  } catch (error) {
    console.error('❌ Erreur traitement paiement réussi:', error);
  }
}

// Traiter un paiement échoué
async function handlePaymentFailed(paymentIntent) {
  try {
    console.log(`❌ Paiement échoué: ${paymentIntent.id}`);
    
    const order = await Order.findByPaymentIntent(paymentIntent.id);
    if (!order) {
      console.error(`❌ Commande non trouvée pour PaymentIntent: ${paymentIntent.id}`);
      return;
    }

    // Marquer la commande comme échouée
    await order.markAsFailed();
    
    console.log(`❌ Commande ${order.orderNumber} marquée comme échouée`);
    
    // TODO: Envoyer un email d'échec de paiement
    // await sendPaymentFailedEmail(order);
    
  } catch (error) {
    console.error('❌ Erreur traitement paiement échoué:', error);
  }
}

// Traiter un paiement annulé
async function handlePaymentCanceled(paymentIntent) {
  try {
    console.log(`🚫 Paiement annulé: ${paymentIntent.id}`);
    
    const order = await Order.findByPaymentIntent(paymentIntent.id);
    if (!order) {
      console.error(`❌ Commande non trouvée pour PaymentIntent: ${paymentIntent.id}`);
      return;
    }

    // Marquer la commande comme échouée
    order.paymentStatus = 'canceled';
    order.status = 'failed';
    await order.save();
    
    console.log(`🚫 Commande ${order.orderNumber} annulée`);
    
  } catch (error) {
    console.error('❌ Erreur traitement paiement annulé:', error);
  }
}

// Traiter une contestation de charge
async function handleChargeDispute(charge) {
  try {
    console.log(`⚠️ Contestation de charge: ${charge.id}`);
    
    // TODO: Implémenter la gestion des contestations
    // - Notifier les administrateurs
    // - Marquer la commande comme contestée
    // - Préparer les documents de défense
    
  } catch (error) {
    console.error('❌ Erreur traitement contestation:', error);
  }
}

// Fonctions utilitaires (réutilisées du checkout controller)
async function generateDownloadLinks(order) {
  const EbookFileService = require('../services/ebook-file.service');
  const Ebook = require('../models/ebook.model');
  
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
  const Ebook = require('../models/ebook.model');
  
  for (const item of order.items) {
    const ebook = await Ebook.findById(item.ebook);
    if (ebook) {
      await ebook.recordSale(item.price * item.quantity);
    }
  }
}