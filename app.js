require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { validateContentType, limitRequestSize } = require('./middlewares');

// Connexion à la base de données
require('./config/db');

const authRouter = require('./routes/user.route');
const articleRouter = require('./routes/article.route');

const app = express();

// Middleware de sécurité globaux
app.use(validateContentType);
app.use(limitRequestSize('10mb'));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/articles', articleRouter);

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
  console.error('Erreur serveur:', error);
  res.status(500).json({
    status: 'error',
    message: 'Erreur interne du serveur'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`server demarre sur le port ${PORT}`);
});