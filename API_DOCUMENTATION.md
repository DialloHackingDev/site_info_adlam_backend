# API Articles - Documentation des Endpoints

## Base URL
```
http://localhost:5000/api/v1
```

## Authentification
- Header: `Authorization: Bearer <token>`
- Cookie: `jwt=<token>`

## Endpoints Articles

### 1. Créer un article (Admin uniquement)
```http
POST /articles
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Mon Premier Article",
  "content": "<p>Contenu de l'article en HTML...</p>",
  "category": "litterature",
  "tags": ["adlam", "culture"],
  "status": "published",
  "excerpt": "Résumé de l'article...",
  "coverImage": "https://example.com/image.jpg",
  "metaTitle": "Titre SEO",
  "metaDescription": "Description SEO"
}
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

### 5. Obtenir les articles par catégorie
```http
GET /articles/category/litterature?page=1&limit=10
```

### 6. Liker un article (Utilisateur connecté)
```http
PATCH /articles/:id/like
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "like"  // ou "unlike"
}
```

### 7. Mettre à jour un article (Admin uniquement)
```http
PATCH /articles/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Titre modifié",
  "status": "published"
}
```

### 8. Supprimer un article (Admin uniquement)
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
      "author": {
        "_id": "...",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "publishedAt": "2026-01-15T10:00:00.000Z",
      "views": 0,
      "likes": 0,
      "readingTime": 3,
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  }
}
```

### Liste d'articles
```json
{
  "status": "success",
  "results": 10,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  },
  "data": {
    "articles": [...]
  }
}
```