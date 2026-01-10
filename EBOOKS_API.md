# API E-books - Documentation Complète

## Base URL
```
http://localhost:5000/api/v1
```

## Authentification
- Header: `Authorization: Bearer <token>`
- Cookie: `jwt=<token>`

---

## 📚 ENDPOINTS E-BOOKS

### 1. Créer un e-book (Admin uniquement)
```http
POST /ebooks
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Form Data:
- title: "Mon E-book en Adlam"
- description: "Description complète de l'e-book..."
- author: "Nom de l'Auteur"
- price: 2500
- currency: "GNF"
- category: "litterature"
- tags: "adlam,culture,pular" (séparés par virgules)
- previewPages: 10
- language: "pular"
- metaTitle: "Titre SEO"
- metaDescription: "Description SEO"
- keywords: "mot1,mot2,mot3"
- status: "published" | "draft"
- cover: [FILE] (image, max 3MB)
- pdfFile: [FILE] (PDF, max 10MB)
```

### 2. Obtenir tous les e-books
```http
GET /ebooks?page=1&limit=12&category=litterature&search=adlam&sort=newest&minPrice=1000&maxPrice=5000&featured=true&language=pular
```

**Paramètres de tri :**
- `newest` : Plus récents (défaut)
- `oldest` : Plus anciens
- `price_low` : Prix croissant
- `price_high` : Prix décroissant
- `popular` : Plus vendus
- `rating` : Mieux notés

### 3. Obtenir un e-book par slug
```http
GET /ebooks/slug/mon-ebook-en-adlam
```

### 4. Obtenir les e-books récents
```http
GET /ebooks/recent?limit=8
```

### 5. Obtenir les e-books en vedette
```http
GET /ebooks/featured?limit=6
```

### 6. Obtenir les best-sellers
```http
GET /ebooks/bestsellers?limit=10&days=30
```

### 7. Obtenir les e-books par catégorie
```http
GET /ebooks/category/litterature?page=1&limit=12
```

### 8. Mettre à jour un e-book (Admin uniquement)
```http
PATCH /ebooks/:id
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Form Data:
- title: "Titre modifié"
- price: 3000
- cover: [FILE] (optionnel, nouvelle couverture)
- pdfFile: [FILE] (optionnel, nouveau PDF)
```

### 9. Basculer le statut featured (Admin uniquement)
```http
PATCH /ebooks/:id/featured
Authorization: Bearer <admin_token>
```

### 10. Générer URL de téléchargement (Utilisateur connecté)
```http
GET /ebooks/:id/download
Authorization: Bearer <token>
```

### 11. Obtenir les statistiques (Admin uniquement)
```http
GET /ebooks/admin/stats
Authorization: Bearer <admin_token>
```

### 12. Supprimer un e-book (Admin uniquement)
```http
DELETE /ebooks/:id
Authorization: Bearer <admin_token>
```

---

## 📋 CATÉGORIES DISPONIBLES

- `litterature` - Littérature
- `histoire` - Histoire
- `education` - Éducation
- `culture` - Culture
- `science` - Science
- `religion` - Religion
- `enfants` - Livres pour enfants

## 🌍 LANGUES SUPPORTÉES

- `pular` - Pular (défaut)
- `french` - Français
- `english` - Anglais
- `arabic` - Arabe

## 💰 DEVISES SUPPORTÉES

- `GNF` - Franc Guinéen (défaut)
- `USD` - Dollar US
- `EUR` - Euro

---

## 📊 EXEMPLES DE RÉPONSES

### E-book créé avec succès
```json
{
  "status": "success",
  "data": {
    "ebook": {
      "_id": "ebook_id",
      "title": "Mon E-book en Adlam",
      "slug": "mon-ebook-en-adlam",
      "description": "Description complète...",
      "author": "Nom de l'Auteur",
      "price": 2500,
      "currency": "GNF",
      "effectivePrice": 2500,
      "onSale": false,
      "category": "litterature",
      "language": "pular",
      "coverImage": "https://res.cloudinary.com/...",
      "pdfFile": "https://res.cloudinary.com/...",
      "previewUrl": "https://res.cloudinary.com/...",
      "pageCount": 150,
      "fileSize": 5242880,
      "previewPages": 10,
      "status": "published",
      "featured": false,
      "views": 0,
      "downloads": 0,
      "sales": 0,
      "revenue": 0,
      "rating": {
        "average": 0,
        "count": 0
      },
      "tags": ["adlam", "culture", "pular"],
      "publishedAt": "2026-01-15T10:00:00.000Z",
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  }
}
```

### Liste d'e-books avec pagination
```json
{
  "status": "success",
  "results": 12,
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 45,
    "pages": 4
  },
  "data": {
    "ebooks": [
      {
        "_id": "ebook_id",
        "title": "E-book 1",
        "slug": "ebook-1",
        "author": "Auteur 1",
        "price": 2500,
        "effectivePrice": 2000,
        "onSale": true,
        "coverImage": "https://...",
        "category": "litterature",
        "rating": {
          "average": 4.5,
          "count": 12
        }
      }
    ]
  }
}
```

### URL de téléchargement sécurisée
```json
{
  "status": "success",
  "data": {
    "downloadUrl": "https://res.cloudinary.com/secure-download-url",
    "expiresIn": 3600
  }
}
```

### Statistiques des e-books
```json
{
  "status": "success",
  "data": {
    "overview": {
      "totalPublished": 45,
      "totalDrafts": 8,
      "totalRevenue": 125000
    },
    "generalStats": [
      {
        "_id": "published",
        "count": 45,
        "totalRevenue": 125000,
        "totalSales": 89,
        "totalDownloads": 234
      }
    ],
    "categoryStats": [
      {
        "_id": "litterature",
        "count": 15,
        "totalRevenue": 45000,
        "totalSales": 32,
        "avgPrice": 2800
      }
    ]
  }
}
```

---

## 🔧 FONCTIONNALITÉS AVANCÉES

### Upload de fichiers multiples
- **Couverture** : Images (JPG, PNG, WebP) max 3MB
- **PDF** : Fichiers PDF max 10MB (réduit pour éviter les problèmes de performance)
- **Optimisation automatique** : Couverture redimensionnée à 400x600px
- **Preview automatique** : Génération d'aperçu des premières pages

### Gestion des prix
- **Prix de base** : Prix normal de l'e-book
- **Prix promotionnel** : Réduction temporaire avec date d'expiration
- **Prix effectif** : Calcul automatique du prix à afficher
- **Multi-devises** : Support GNF, USD, EUR

### Système de preview
- **Pages configurables** : 5 à 50 pages de preview
- **URL sécurisée** : Génération automatique d'aperçu
- **Optimisation** : Images de preview optimisées

### Téléchargement sécurisé
- **URLs temporaires** : Liens de téléchargement avec expiration
- **Vérification d'achat** : Contrôle des droits de téléchargement
- **Watermark** : Protection contre le piratage
- **Compteurs** : Suivi des téléchargements

### Recherche et filtres
- **Recherche full-text** : Titre, description, auteur, tags
- **Filtres avancés** : Catégorie, prix, langue, statut featured
- **Tri intelligent** : Par date, prix, popularité, note
- **Pagination** : Navigation efficace

### Statistiques complètes
- **Ventes** : Nombre de ventes et revenus par e-book
- **Téléchargements** : Compteur de téléchargements
- **Vues** : Statistiques de consultation
- **Catégories** : Performance par catégorie
- **Tendances** : Évolution dans le temps

---

## 🛡️ SÉCURITÉ

### Validation des fichiers
- **Types MIME** : Vérification stricte des formats
- **Taille** : Limites de taille configurables
- **Contenu** : Validation du contenu des fichiers
- **Noms** : Nettoyage des noms de fichiers

### Protection des téléchargements
- **URLs signées** : Liens temporaires sécurisés
- **Vérification d'achat** : Contrôle des droits
- **Rate limiting** : Limitation des téléchargements
- **Logs** : Traçabilité des accès

### Gestion des permissions
- **Admin uniquement** : Création, modification, suppression
- **Utilisateurs** : Consultation et téléchargement après achat
- **Propriétaire** : Gestion de ses propres e-books

Le système d'e-books est maintenant **100% opérationnel** ! 🎉