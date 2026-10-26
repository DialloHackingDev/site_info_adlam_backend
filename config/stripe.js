const Stripe = require('stripe');

// Devises sans sous-unité chez Stripe : le montant s'envoie tel quel (pas de x100)
const ZERO_DECIMAL_CURRENCIES = ['gnf', 'xof', 'xaf', 'jpy', 'krw'];

const toStripeAmount = (amount, currency = 'gnf') => {
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currency.toLowerCase());
  return Math.round(isZeroDecimal ? amount : amount * 100);
};

// Vérifier que la clé Stripe est configurée
if (!process.env.STRIPE_SECRET_KEY || 
    process.env.STRIPE_SECRET_KEY === 'sk_test_your_stripe_secret_key' ||
    process.env.STRIPE_SECRET_KEY === 'sk_test_simulation_mode') {
  console.log('🟡 MODE SIMULATION - Paiements simulés (pas de Stripe réel)');
  
  // Exporter un service mock pour le développement
  module.exports = {
    stripe: null,
    StripeService: {
      createPaymentIntent: () => Promise.reject(new Error('Stripe non configuré')),
      confirmPayment: () => Promise.reject(new Error('Stripe non configuré')),
      getPaymentIntent: () => Promise.reject(new Error('Stripe non configuré')),
      createRefund: () => Promise.reject(new Error('Stripe non configuré')),
      constructWebhookEvent: () => { throw new Error('Stripe non configuré'); },
      toStripeAmount,
      calculateFees: (amount) => ({ amount, percentageFee: 0, fixedFee: 0, totalFees: 0, netAmount: amount })
    }
  };
  return;
}

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Version API Stripe stable
  typescript: false
});

/**
 * Service de gestion des paiements Stripe
 */
class StripeService {
  /**
   * Créer un PaymentIntent pour un montant donné
   */
  static async createPaymentIntent(amount, currency = 'gnf', metadata = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: toStripeAmount(amount, currency),
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true
        }
      });

      return paymentIntent;
    } catch (error) {
      console.error('Erreur création PaymentIntent:', error);
      throw new Error(`Erreur paiement: ${error.message}`);
    }
  }

  /**
   * Confirmer un paiement
   */
  static async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Erreur confirmation paiement:', error);
      throw new Error(`Erreur confirmation: ${error.message}`);
    }
  }

  /**
   * Récupérer un PaymentIntent
   */
  static async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Erreur récupération PaymentIntent:', error);
      throw new Error(`PaymentIntent non trouvé: ${error.message}`);
    }
  }

  /**
   * Créer un remboursement
   */
  static async createRefund(paymentIntentId, amount = null, currency = 'gnf') {
    try {
      const refundData = { payment_intent: paymentIntentId };
      if (amount) {
        refundData.amount = toStripeAmount(amount, currency);
      }

      const refund = await stripe.refunds.create(refundData);
      return refund;
    } catch (error) {
      console.error('Erreur remboursement:', error);
      throw new Error(`Erreur remboursement: ${error.message}`);
    }
  }

  /**
   * Construire l'événement webhook
   */
  static constructWebhookEvent(payload, signature) {
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!endpointSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET manquant');
      }

      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
      );

      return event;
    } catch (error) {
      console.error('Erreur webhook Stripe:', error);
      throw new Error(`Webhook invalide: ${error.message}`);
    }
  }

  static toStripeAmount(amount, currency) {
    return toStripeAmount(amount, currency);
  }

  /**
   * Calculer les frais de transaction (exemple: 2.9% + 30 centimes)
   */
  static calculateFees(amount, currency = 'gnf') {
    const feePercentage = 0.029; // 2.9%
    const fixedFee = currency === 'gnf' ? 30 : 0.30; // 30 GNF ou 30 centimes
    
    const percentageFee = amount * feePercentage;
    const totalFees = percentageFee + fixedFee;
    
    return {
      amount,
      percentageFee: Math.round(percentageFee * 100) / 100,
      fixedFee,
      totalFees: Math.round(totalFees * 100) / 100,
      netAmount: Math.round((amount - totalFees) * 100) / 100
    };
  }
}

module.exports = {
  stripe,
  StripeService
};