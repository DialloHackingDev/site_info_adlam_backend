const User = require("../models/users.model");  // Assure-toi que le chemin est correct (users.model.js ?)
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');  // Pas utilisé ici, tu peux le supprimer si pas besoin ailleurs

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Validation des types pour prévenir l'injection NoSQL
    if (!name || !email || !password || 
        typeof name !== 'string' || 
        typeof email !== 'string' || 
        typeof password !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: "Tous les champs sont obligatoires et doivent être des chaînes de caractères !"
      });
    }
    
    // Créer l'utilisateur avec le rôle spécifié (admin si fourni)
    const userData = { name, email, password };
    if (role && (role === 'admin' || role === 'user')) {
      userData.role = role;
    }
    
    const newUser = await User.create(userData);

    const token = signToken(newUser._id);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      }
    });
  } catch (error) {
    // Gestion spécifique pour email duplicate
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: "Cet email est déjà utilisé"
      });
    }
    console.log(error)
    res.status(400).json({
      status: 'error',
      message: error.message || 'Erreur lors de la création du compte'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation des types pour prévenir l'injection NoSQL
    if (!email || !password || 
        typeof email !== 'string' || 
        typeof password !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Email et mot de passe doivent être des chaînes de caractères'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Email ou mot de passe incorrect'
      });
    }
    
    const verifyPassword = await user.comparePassword(password);
    if (!verifyPassword) {
      return res.status(401).json({
        status: 'error',
        message: 'Email ou mot de passe incorrect'
      });
      
    }

    const token = signToken(user._id);

    const cookieOptions = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.cookie('jwt', token, cookieOptions);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur serveur lors de la connexion'
    });
    console.log(error)
  }
};

// Obtenir l'utilisateur actuel (profil)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: user.getPublicData()
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur serveur lors de la récupération du profil'
    });
    console.log(error)
  }
};