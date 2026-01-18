# 📚 Documentation API Adlam - Système Complet

## 🎯 Fonctionnalités Implémentées

### 👤 Authentification & Utilisateurs
- **Inscription** : `POST /api/v1/auth/register`
  - Champs requis : `name`, `email`, `password`
  - Hachage automatique du mot de passe
  - Génération de token JWT
  
- **Connexion** : `POST /api/v1/auth/login`
- **Profil** : `GET /api/v1/auth/me`

### 🏪 Boutique (Gestion Dynamique par Admin)
- **Informations boutique** : `GET /api/v1/shop`
- **Configuration boutique** : `PUT /api/v1/shop` (Admin uniquement)
  - Logo, bannière, informations de contact
  - Réseaux sociaux, paramètres

### 📝 Articles (Gestion Dynamique par Admin)
- **Création** : `POST /api/v1/articles` (Admin/Auteur)
- **Liste publique** : `GET /api/v1/articles`
- **Par slug** : `GET /api/v1/articles/:slug`
- **Récents** : `GET /api/v1/articles/recent`
- **En vedette** : `GET /api/v1/articles/featured`
- **Par catégorie** : `GET /api/v1/articles/category/:category`
- **Modification** : `PUT /api/v1/articles/:id` (Admin/Auteur)
- **Suppression** : `DELETE /api/v1/articles/:id` (Admin/Auteur)
- **Basculer vedette** : `PATCH /api/v1/articles/:id/featured` (Admin)

### 📚 E-books (Gestion Dynamique par Admin)
- **Création** : `POST /api/v1/ebooks` (Admin)
- **Liste publique** : `GET /api/v1/ebooks`
- **Par slug** : `GET /api/v1/ebooks/:slug`
- **Récents** : `GET /api/v1/ebooks/recent`
- **En vedette** : `GET /api/v1/ebooks/featured`
- **Best-sellers** : `GET /api/v1/ebooks/bestsellers`
- **Par catégorie** : `GET /api/v1/ebooks/category/:category`
- **Modification** : `PUT /api/v1/ebooks/:id` (Admin)
- **Suppression** : `DELETE /api/v1/ebooks/:id` (Admin)
- **Téléchargement sécurisé** : `GET /api/v1/ebooks/:id/download`

### 📄 Documents (Gestion Dynamique par Admin)
- **Création** : `POST /api/v1/documents` (Admin uniquement)
- **Liste publique** : `GET /api/v1/documents`
- **Par slug** : `GET /api/v1/documents/:slug`
- **Récents** : `GET /api/v1/documents/recent`
- **En vedette** : `GET /api/v1/documents/featured`
- **Par catégorie** : `GET /api/v1/documents/category/:category`
- **Par type** : `GET /api/v1/documents/type/:type`
- **Téléchargement** : `GET /api/v1/documents/:id/download`
- **Modification** : `PUT /api/v1/documents/:id` (Admin)
- **Suppression** : `DELETE /api/v1/documents/:id` (Admin)

### 🛒 Panier & Commandes
- **Ajouter au panier** : `POST /api/v1/cart/add`
- **Voir panier** : `GET /api/v1/cart`
- **Modifier quantité** : `PUT /api/v1/cart/:id`
- **Supprimer du panier** : `DELETE /api/v1/cart/:id`
- **Vider panier** : `DELETE /api/v1/cart`
- **Checkout** : `POST /api/v1/checkout/create-payment-intent`

### 💬 Commentaires & Likes
- **Commenter** : `POST /api/v1/comments`
- **Liker/Unliker** : `POST /api/v1/likes/toggle`
- **Vérifier likes** : `POST /api/v1/likes/check`

### 🔧 Administration (Admin uniquement)
- **Dashboard** : `GET /api/v1/admin/dashboard`
  - Statistiques utilisateurs, articles, ebooks, documents
- **Gestion utilisateurs** : 
  - `GET /api/v1/admin/users`
  - `PUT /api/v1/admin/users/:id/role`
  - `DELETE /api/v1/admin/users/:id`
- **Gestion contenus** : `GET /api/v1/admin/content`

## 🗂️ Structure des Modèles

### User
```javascript
{
  name: String (requis),
  email: String (requis, unique),
  password: String (requis, haché automatiquement),
  role: 'user' | 'admin' (défaut: 'user'),
  createdAt: Date
}
```

### Shop
```javascript
{
  name: String,
  description: String,
  logo: String,
  banner: String,
  contact: { email, phone, address },
  socialMedia: { facebook, twitter, instagram, website },
  settings: { currency, language, timezone },
  status: 'active' | 'maintenance' | 'closed'
}
```

### Article
```javascript
{
  title: String (requis),
  slug: String (auto-généré),
  content: String (requis),
  excerpt: String,
  coverImage: String,
  category: 'litterature' | 'histoire' | 'education' | 'culture' | 'science' | 'religion',
  tags: [String],
  status: 'draft' | 'published' | 'scheduled',
  author: ObjectId (User),
  featured: Boolean,
  views: Number,
  likes: Number
}
```

### Ebook
```javascript
{
  title: String (requis),
  slug: String (auto-généré),
  description: String (requis),
  author: String (requis),
  price: Number,
  currency: 'GNF' | 'USD' | 'EUR',
  coverImage: String,
  pdfFile: String,
  category: 'litterature' | 'histoire' | 'education' | 'culture' | 'science' | 'religion' | 'enfants',
  language: 'pular' | 'french' | 'english' | 'arabic',
  status: 'draft' | 'published' | 'archived',
  featured: Boolean,
  sales: Number,
  revenue: Number
}
```

### Document
```javascript
{
  title: String (requis),
  slug: String (auto-généré),
  description: String,
  type: 'pdf' | 'doc' | 'image' | 'video' | 'audio' | 'other',
  category: 'legal' | 'educational' | 'cultural' | 'administrative' | 'historical' | 'religious' | 'other',
  fileUrl: String (requis),
  fileName: String,
  fileSize: Number,
  thumbnailUrl: String,
  language: 'pular' | 'french' | 'english' | 'arabic',
  status: 'draft' | 'published' | 'archived',
  isPublic: Boolean,
  allowDownload: Boolean,
  featured: Boolean,
  downloads: Number,
  views: Number
}
```

## 🔐 Système d'Autorisation

### Rôles
- **user** : Utilisateur standard (lecture, commentaires, likes, achats)
- **admin** : Administrateur (toutes les permissions + gestion de contenu)

### Permissions
- **Public** : Lecture des contenus publiés
- **Utilisateur connecté** : Commentaires, likes, panier, achats
- **Admin** : Création/modification/suppression de tous les contenus

## 🚀 Démarrage

1. **Installation des dépendances** :
   ```bash
   npm install
   ```

2. **Configuration de l'environnement** :
   Créer un fichier `.env` avec :
   ```
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/adlam
   JWT_SECRET=votre_secret_jwt
   JWT_EXPIRES_IN=30d
   FRONTEND_URL=http://localhost:5173
   CLOUDINARY_CLOUD_NAME=votre_cloud_name
   CLOUDINARY_API_KEY=votre_api_key
   CLOUDINARY_API_SECRET=votre_api_secret
   ```

3. **Démarrage du serveur** :
   ```bash
   npm start
   # ou pour le développement
   npm run dev
   ```

## 📋 Fonctionnalités Clés

✅ **Inscription/Connexion** avec nom, email, password  
✅ **Gestion dynamique de la boutique** par l'admin  
✅ **Gestion dynamique des articles** par l'admin  
✅ **Gestion dynamique des e-books** par l'admin  
✅ **Gestion dynamique des documents** par l'admin  
✅ **Upload de fichiers** (images, PDFs, documents)  
✅ **Système de permissions** (user/admin)  
✅ **Dashboard administrateur** avec statistiques  
✅ **API RESTful** complète  
✅ **Validation et sécurité** des données  
✅ **Gestion des erreurs** centralisée  

Le système est maintenant prêt pour la production avec toutes les fonctionnalités demandées ! 🎉