# API Boutique - Panier & Checkout

## Base URL
```
http://localhost:5000/api/v1
```

## Authentification
- Header: `Authorization: Bearer <token>`
- Toutes les routes nécessitent une authentification

## Variables d'environnement requises
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🛒 PANIER (CART)

### 1. Obtenir le panier
```http
GET /cart
Authorization: Bearer <token>
```

### 2. Obtenir le nombre d'items
```http
GET /cart/count
Authorization: Bearer <token>
```

### 3. Ajouter un e-book au panier
```http
POST /cart/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "ebookId": "ebook_id_here",
  "quantity": 1
}
```

### 4. Mettre à jour la quantité
```http
PATCH /cart/:ebookId
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 2
}
```

### 5. Supprimer un item du panier
```http
DELETE /cart/:ebookId
Authorization: Bearer <token>
```

### 6. Vider le panier
```http
DELETE /cart/clear
Authorization: Bearer <token>
```

### 7. Synchroniser les prix
```http
PATCH /cart/sync
Authorization: Bearer <token>
```

---

## 💳 CHECKOUT & PAIEMENTS

### 1. Créer une session de checkout
```http
POST /checkout/create-session
Authorization: Bearer <token>
```

### 2. Confirmer le paiement
```http
POST /checkout/confirm-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentIntentId": "pi_1234567890"
}
```

### 3. Obtenir les commandes
```http
GET /checkout/orders?page=1&limit=10&status=completed
Authorization: Bearer <token>
```

### 4. Obtenir une commande spécifique
```http
GET /checkout/orders/:orderId
Authorization: Bearer <token>
```

### 5. Télécharger un e-book acheté
```http
GET /checkout/orders/:orderId/download/:ebookId
Authorization: Bearer <token>
```

### 6. Webhook Stripe (automatique)
```http
POST /checkout/webhook
Content-Type: application/json
Stripe-Signature: signature_here

[Stripe webhook payload]
```

---

## 📊 EXEMPLES DE RÉPONSES

### Panier avec items
```json
{
  "status": "success",
  "data": {
    "cart": {
      "_id": "cart_id",
      "user": "user_id",
      "items": [
        {
          "_id": "item_id",
          "ebook": {
            "_id": "ebook_id",
            "title": "Mon E-book",
            "author": "Auteur",
            "price": 2500,
            "discountPrice": 2000,
            "coverImage": "https://...",
            "status": "published"
          },
          "quantity": 1,
          "price": 2000,
          "addedAt": "2026-01-15T10:00:00.000Z"
        }
      ],
      "totalItems": 1,
      "totalAmount": 2000,
      "currency": "GNF",
      "lastUpdated": "2026-01-15T10:00:00.000Z"
    }
  }
}
```

### Session de checkout créée
```json
{
  "status": "success",
  "data": {
    "clientSecret": "pi_1234567890_secret_abcdef",
    "paymentIntentId": "pi_1234567890",
    "order": {
      "id": "order_id",
      "orderNumber": "ADL-ABC123-DEF45",
      "total": 2000,
      "currency": "GNF"
    }
  }
}
```

### Paiement confirmé
```json
{
  "status": "success",
  "message": "Paiement confirmé",
  "data": {
    "order": {
      "id": "order_id",
      "orderNumber": "ADL-ABC123-DEF45",
      "status": "completed",
      "total": 2000
    }
  }
}
```

### Liste des commandes
```json
{
  "status": "success",
  "results": 5,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  },
  "data": {
    "orders": [
      {
        "_id": "order_id",
        "orderNumber": "ADL-ABC123-DEF45",
        "status": "completed",
        "total": 2000,
        "currency": "GNF",
        "items": [
          {
            "ebook": {
              "title": "Mon E-book",
              "slug": "mon-ebook",
              "coverImage": "https://..."
            },
            "title": "Mon E-book",
            "author": "Auteur",
            "price": 2000,
            "quantity": 1
          }
        ],
        "paidAt": "2026-01-15T10:05:00.000Z",
        "completedAt": "2026-01-15T10:05:30.000Z",
        "createdAt": "2026-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

### Lien de téléchargement
```json
{
  "status": "success",
  "data": {
    "downloadUrl": "https://res.cloudinary.com/secure-download-url",
    "expiresAt": "2026-01-16T10:00:00.000Z",
    "remainingDownloads": 4
  }
}
```

---

## 🔄 FLUX DE PAIEMENT

### 1. Côté Frontend
```javascript
// 1. Ajouter des items au panier
await fetch('/api/v1/cart/add', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ebookId: 'ebook_id',
    quantity: 1
  })
});

// 2. Créer une session de checkout
const checkoutResponse = await fetch('/api/v1/checkout/create-session', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token }
});
const { clientSecret, paymentIntentId } = await checkoutResponse.json();

// 3. Utiliser Stripe Elements pour le paiement
const stripe = Stripe('pk_test_...');
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  clientSecret,
  confirmParams: {
    return_url: 'https://yoursite.com/checkout/success'
  }
});

// 4. Confirmer le paiement côté serveur
if (paymentIntent.status === 'succeeded') {
  await fetch('/api/v1/checkout/confirm-payment', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      paymentIntentId: paymentIntent.id
    })
  });
}
```

### 2. Côté Backend (automatique)
1. **Webhook Stripe** reçoit l'événement `payment_intent.succeeded`
2. **Commande** marquée comme payée et complétée
3. **Liens de téléchargement** générés automatiquement
4. **Statistiques e-books** mises à jour
5. **Panier** vidé automatiquement

---

## 🛡️ SÉCURITÉ

### Validation des paiements
- **Double vérification** : Frontend + Webhook
- **Signature Stripe** : Validation des webhooks
- **Montants** : Vérification côté serveur
- **Utilisateur** : Vérification des permissions

### Protection des téléchargements
- **URLs temporaires** : Expiration 24h
- **Limite de téléchargements** : 5 max par e-book
- **Vérification d'achat** : Contrôle des droits
- **Compteurs** : Suivi des téléchargements

### Gestion des erreurs
- **Paiements échoués** : Commandes marquées comme failed
- **Webhooks manqués** : Réconciliation possible
- **Items invalides** : Nettoyage automatique du panier
- **Expirations** : Régénération des liens

---

## 📈 STATUTS DES COMMANDES

| Statut | Description |
|--------|-------------|
| `pending` | Commande créée, paiement en attente |
| `processing` | Paiement réussi, traitement en cours |
| `completed` | Commande complétée, téléchargements disponibles |
| `failed` | Paiement échoué |
| `refunded` | Commande remboursée |

## 💰 DEVISES SUPPORTÉES

- **GNF** - Franc Guinéen (défaut)
- **USD** - Dollar US  
- **EUR** - Euro

## 🔧 CONFIGURATION STRIPE

### Webhooks à configurer
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.dispute.created`

### URL du webhook
```
https://votre-domaine.com/api/v1/checkout/webhook
```

Le système de boutique est maintenant **100% fonctionnel** ! 🎉