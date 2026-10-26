require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
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
const contactRouter = require('./routes/contact.route');

const app = express();

// Trust proxy pour Render
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Sécurité avec Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// Middleware de limitation de taille AVANT le parsing
app.use(limitRequestSize('10mb'));

// CORS - origines autorisées (CORS_ORIGINS permet d'en ajouter, séparées par des virgules)
const allowedOrigins = [
  'https://yelaare.vercel.app',
  'https://adlam-fulani-front.vercel.app',
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : []),
  ...(process.env.NODE_ENV !== 'production' ? [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176'
  ] : [])
];

const corsOptions = {
  origin: function(origin, callback) {
    // Autoriser les requêtes sans origin (Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ Origin bloquée:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Désactiver le cache en développement
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });
}

// Configuration UTF-8 pour supporter les caractères Adlam
// Le webhook Stripe a besoin du body brut pour vérifier la signature (express.raw sur sa route)
const jsonParser = express.json({ limit: '10mb', charset: 'utf-8' });
app.use((req, res, next) => {
  if (req.originalUrl === '/api/v1/checkout/webhook') return next();
  jsonParser(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '10mb', charset: 'utf-8' }));
app.use(morgan("dev"));
app.use(cookieParser());

// Middleware de validation Content-Type APRÈS le parsing
app.use(validateContentType);

// Les PDF locaux ne sont jamais servis en statique : ils passent par /ebooks/:id/stream
app.use('/uploads', (req, res, next) => {
  if (/\.pdf$/i.test(req.path)) {
    return res.status(404).end();
  }
  next();
});

// Servir les images du dossier uploads (express.static déduit le Content-Type de l'extension)
app.use('/uploads', express.static('uploads', {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
  }
}));

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
app.use('/api/v1/contact', contactRouter);

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