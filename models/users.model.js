const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false 
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware pour hacher le mot de passe avant de sauvegarder
userSchema.pre('save', async function() {
  // Ne hacher que si le mot de passe a été modifié
  if (!this.isModified('password')) return;
  
  // Hacher le mot de passe avec un coût de 12
  this.password = await bcrypt.hash(this.password, 12);
});

// Méthode pour comparer le mot de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    if (!this.password) {
      throw new Error('Password not found');
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Méthode pour obtenir les données publiques de l'utilisateur
userSchema.methods.getPublicData = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model("User",userSchema);