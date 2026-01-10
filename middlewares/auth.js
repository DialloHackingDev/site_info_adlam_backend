const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/users.model');

/**
 * Middleware d'authentification obligatoire
 * Vérifie la présence et la validité du token JWT
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Récupérer le token depuis les headers ou cookies
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Accès non autorisé. Token manquant.'
      });
    }

    // Vérifier et décoder le token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Vérifier si l'utilisateur existe encore
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    // Ajouter l'utilisateur à la requête
    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Token invalide ou expiré'
    });
  }
};

/**
 * Middleware d'authentification optionnelle
 * Ajoute l'utilisateur à req.user s'il est connecté, sinon continue
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (token) {
      const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continuer même si le token est invalide
    next();
  }
};