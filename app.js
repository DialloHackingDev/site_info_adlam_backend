require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require("morgan");
const cookieParser = require('cookie-parser');
const { validateContentType, limitRequestSize } = require('./middlewares');
const schedulerService = require('./services/scheduler.service');

// Connexion à la base de données
require('./config/db');

const authRouter = require('./routes/user.route');
const articleRouter = require('./routes/article.route');
const commentRouter = require('./routes/comment.route');
const likeRouter = require('./routes/like.route');
const articleLikeRouter = require('./routes/article-like.route');
const ebookRouter = require('./routes/ebook.route');
const cartRouter = require('./routes/cart.route');
const checkoutRouter = require('./routes/checkout.route');
const shopRouter = require('./routes/shop.route');
const adminRouter = require('./routes/admin.route');
const documentRouter = require('./routes/document.route');

const app = express();

// Middleware de sécurité globaux
app.use(validateContentType);
app.use(limitRequestSize('10mb'));

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174','http://localhost:5175','http://localhost:5176'], // Support des deux ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configuration UTF-8 pour supporter les caractères Adlam
app.use(express.json({ limit: '10mb', charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, limit: '10mb', charset: 'utf-8' }));
app.use(morgan("dev"));
app.use(cookieParser());

// Servir les fichiers statiques du dossier uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/articles', articleRouter);
app.use('/api/v1/article-likes', articleLikeRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/likes', likeRouter);
app.use('/api/v1/ebooks', ebookRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/checkout', checkoutRouter);
app.use('/api/v1/shop', shopRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/documents', documentRouter);

// Route de test
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});




// Gestion globale des erreurs
app.use((error, req, res, next) => {
  // Erreur de parsing JSON
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      status: 'error',
      message: 'JSON invalide - vérifiez la syntaxe (virgules, guillemets)'
    });
  }

  console.error('Erreur serveur:', error.message);
  res.status(500).json({
    status: 'error',
    message: 'Erreur interne du serveur'
  });
});
app.get("/", (req, res) => {
  res.send("bienvenue dans app nodejs")
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);

  // Démarrer le scheduler des articles planifiés
  schedulerService.start();
});

// Arrêter proprement le scheduler lors de l'arrêt du serveur
process.on('SIGTERM', () => {
  console.log('SIGTERM reçu, arrêt du serveur...');
  schedulerService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT reçu, arrêt du serveur...');
  schedulerService.stop();
  process.exit(0);
});