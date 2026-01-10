# API Articles - Documentation des Endpoints

## Base URL
```
http://localhost:5000/api/v1
```

## Authentification
- Header: `Authorization: Bearer <token>`
- Cookie: `jwt=<token>`

## Variables d'environnement Cloudinary requises
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Endpoints Articles

### 1. Créer un article avec image (Admin uniquement)
```http
POST /articles
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Form Data:
- title: "Mon Premier Article"
- content: "<p>Contenu de l'article en HTML...</p>"
- category: "litterature"
- tags: ["adlam", "culture"]
- status: "published" | "draft" | "scheduled"
- excerpt: "Résumé de l'article..."
- coverImage: [FILE] (optionnel, max 5MB)
- metaTitle: "Titre SEO"
- metaDescription: "Description SEO"
- featured: true | false
- scheduledAt: "2026-01-20T10:00:00.000Z" (si status = "scheduled")
```

### 2. Obtenir tous les articles
```http
GET /articles?page=1&limit=10&category=litterature&search=adlam&sort=publishedAt&order=desc
```

### 3. Obtenir un article par slug
```http
GET /articles/slug/mon-premier-article
```

### 4. Obtenir les articles récents
```http
GET /articles/recent?limit=5
```

### 5. Obtenir les articles en vedette
```http
GET /articles/featured?limit=3
```

### 6. Obtenir les articles populaires
```http
GET /articles/popular?limit=5&days=7
```

### 7. Obtenir les articles par catégorie
```http
GET /articles/category/litterature?page=1&limit=10
```

### 8. Liker un article (Utilisateur connecté)
```http
PATCH /articles/:id/like
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "like"  // ou "unlike"
}
```

### 9. Mettre à jour un article avec image (Admin uniquement)
```http
PATCH /articles/:id
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Form Data:
- title: "Titre modifié"
- status: "published"
- coverImage: [FILE] (optionnel, remplace l'ancienne)
```

### 10. Basculer le statut featured (Admin uniquement)
```http
PATCH /articles/:id/featured
Authorization: Bearer <admin_token>
```

### 11. Planifier un article (Admin uniquement)
```http
PATCH /articles/:id/schedule
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "scheduledAt": "2026-01-20T10:00:00.000Z"
}
```

### 12. Annuler la planification (Admin uniquement)
```http
PATCH /articles/:id/unschedule
Authorization: Bearer <admin_token>
```

### 13. Obtenir les statistiques (Admin uniquement)
```http
GET /articles/stats
Authorization: Bearer <admin_token>
```

### 14. Supprimer un article (Admin uniquement)
```http
DELETE /articles/:id
Authorization: Bearer <admin_token>
```

## Catégories disponibles
- `litterature`
- `histoire`
- `education`
- `culture`
- `science`
- `religion`

## Statuts d'article
- `draft` - Brouillon
- `published` - Publié
- `scheduled` - Planifié

## Fonctionnalités avancées

### Génération automatique de slug
- Le slug est généré automatiquement depuis le titre
- Garantit l'unicité en ajoutant un numéro si nécessaire
- Format: `mon-titre-article` ou `mon-titre-article-2`

### Upload d'images
- Formats supportés: JPG, JPEG, PNG, WebP
- Taille maximum: 5MB
- Optimisation automatique: 1200x600px, format WebP
- Stockage: Cloudinary
- Suppression automatique lors de la mise à jour/suppression

### Planification d'articles
- Scheduler automatique qui vérifie chaque minute
- Publication automatique à la date prévue
- Gestion des fuseaux horaires

### Articles en vedette
- Système de mise en avant
- Endpoint dédié pour récupérer les articles featured
- Toggle simple pour admin

## Exemples de réponses

### Article créé avec succès
```json
{
  "status": "success",
  "data": {
    "article": {
      "_id": "...",
      "title": "Mon Premier Article",
      "slug": "mon-premier-article",
      "content": "...",
      "category": "litterature",
      "status": "published",
      "coverImage": "https://res.cloudinary.com/...",
      "author": {
        "_id": "...",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "publishedAt": "2026-01-15T10:00:00.000Z",
      "views": 0,
      "likes": 0,
      "readingTime": 3,
      "featured": false,
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  }
}
```

### Statistiques des articles
```json
{
  "status": "success",
  "data": {
    "overview": {
      "totalPublished": 25,
      "totalDrafts": 5,
      "totalScheduled": 2
    },
    "categoryStats": [
      {
        "_id": "litterature",
        "count": 10,
        "totalViews": 1500,
        "totalLikes": 250
      }
    ],
    "scheduledStats": {
      "total": 2,
      "nextScheduled": "2026-01-20T10:00:00.000Z"
    }
  }
}
```