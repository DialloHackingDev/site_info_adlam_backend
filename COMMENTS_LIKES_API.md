# API Commentaires et Likes - Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentification
- Header: `Authorization: Bearer <token>`
- Cookie: `jwt=<token>`

---

## 📝 ENDPOINTS COMMENTAIRES

### 1. Créer un commentaire
```http
POST /comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Excellent article ! Merci pour le partage.",
  "articleId": "article_id_here",
  "parentCommentId": "parent_comment_id" // Optionnel pour les réponses
}
```

### 2. Obtenir les commentaires d'un article
```http
GET /comments/article/:articleId?page=1&limit=20&sort=newest
```

**Paramètres de tri :**
- `newest` : Plus récents d'abord (défaut)
- `oldest` : Plus anciens d'abord  
- `popular` : Plus likés d'abord

### 3. Obtenir les réponses d'un commentaire
```http
GET /comments/:commentId/replies?limit=10
```

### 4. Modifier un commentaire
```http
PATCH /comments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Contenu modifié du commentaire"
}
```

### 5. Supprimer un commentaire
```http
DELETE /comments/:id
Authorization: Bearer <token>
```

### 6. Liker un commentaire
```http
PATCH /comments/:id/like
Authorization: Bearer <token>
```

### 7. Signaler un commentaire
```http
POST /comments/:id/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "spam" // ou "inappropriate", "offensive", etc.
}
```

### 8. File de modération (Admin)
```http
GET /comments/moderation?status=pending&page=1&limit=50
Authorization: Bearer <admin_token>
```

### 9. Modérer un commentaire (Admin)
```http
PATCH /comments/:id/moderate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "action": "approve" // ou "reject", "spam"
}
```

---

## ❤️ ENDPOINTS LIKES

### 1. Liker un article
```http
PATCH /likes/article/:id
Authorization: Bearer <token>
```

### 2. Liker un commentaire
```http
PATCH /likes/comment/:id
Authorization: Bearer <token>
```

### 3. Obtenir les likes d'un utilisateur
```http
GET /likes/user?targetType=Article&page=1&limit=20
Authorization: Bearer <token>
```

### 4. Vérifier les likes utilisateur
```http
POST /likes/check
Authorization: Bearer <token>
Content-Type: application/json

{
  "targets": [
    { "type": "Article", "id": "article_id_1" },
    { "type": "Comment", "id": "comment_id_1" }
  ]
}
```

### 5. Contenu populaire
```http
GET /likes/popular?type=Article&days=7&limit=10
```

### 6. Statistiques de likes
```http
GET /likes/stats/Article/:id
```

### 7. Statistiques globales (Admin)
```http
GET /likes/admin/stats?days=30
Authorization: Bearer <admin_token>
```

---

## 📊 EXEMPLES DE RÉPONSES

### Commentaire créé
```json
{
  "status": "success",
  "data": {
    "comment": {
      "_id": "comment_id",
      "content": "Excellent article !",
      "author": {
        "_id": "user_id",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "article": "article_id",
      "parentComment": null,
      "level": 0,
      "status": "approved",
      "likes": 0,
      "isEdited": false,
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  }
}
```

### Liste de commentaires avec réponses
```json
{
  "status": "success",
  "results": 5,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25
  },
  "stats": {
    "totalComments": 25,
    "totalLikes": 150,
    "mainComments": 15,
    "replies": 10
  },
  "data": {
    "comments": [
      {
        "_id": "comment_id",
        "content": "Commentaire principal",
        "author": { "name": "John Doe" },
        "level": 0,
        "likes": 5,
        "replies": [
          {
            "_id": "reply_id",
            "content": "Réponse au commentaire",
            "author": { "name": "Jane Smith" },
            "level": 1,
            "likes": 2
          }
        ],
        "repliesCount": 1
      }
    ],
    "userLikes": {
      "Comment_comment_id": true,
      "Comment_reply_id": false
    }
  }
}
```

### Résultat de like/unlike
```json
{
  "status": "success",
  "data": {
    "action": "liked", // ou "unliked"
    "likesCount": 15,
    "userHasLiked": true
  }
}
```

### Vérification des likes utilisateur
```json
{
  "status": "success",
  "data": {
    "userLikes": {
      "Article_article_id_1": true,
      "Comment_comment_id_1": false
    }
  }
}
```

### Contenu populaire
```json
{
  "status": "success",
  "results": 5,
  "data": {
    "popularContent": [
      {
        "content": {
          "_id": "article_id",
          "title": "Article populaire",
          "slug": "article-populaire"
        },
        "likesCount": 45,
        "lastLiked": "2026-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

## 🔧 FONCTIONNALITÉS AVANCÉES

### Système de commentaires hiérarchiques
- **2 niveaux maximum** : Commentaire → Réponse → Réponse à la réponse
- **Auto-validation** des niveaux lors de la création
- **Suppression en cascade** : Supprimer un commentaire principal supprime ses réponses

### Système de likes intelligent
- **Prévention des doublons** : Un utilisateur ne peut liker qu'une fois
- **Toggle automatique** : Like/Unlike en une seule action
- **Compteurs synchronisés** : Mise à jour automatique des compteurs
- **Traçabilité** : IP et timestamp pour chaque like

### Modération avancée
- **Statuts multiples** : pending, approved, rejected, spam
- **File de modération** pour les admins
- **Signalement utilisateur** avec compteurs
- **Actions groupées** possibles

### Statistiques complètes
- **Par article** : Nombre de commentaires, likes, réponses
- **Par utilisateur** : Historique des likes et commentaires
- **Globales** : Tendances, contenu populaire
- **Temporelles** : Statistiques par période

---

## ⚡ OPTIMISATIONS

### Index MongoDB
- Commentaires par article et statut
- Likes par utilisateur et cible
- Recherche rapide des réponses

### Pagination intelligente
- Limite par défaut raisonnable
- Compteurs optimisés
- Tri personnalisable

### Validation robuste
- Longueur des commentaires (3-1000 caractères)
- Types de données vérifiés
- Prévention des injections

Le système de commentaires et likes est maintenant **100% fonctionnel** ! 🎉