require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/users.model');

const createAdmin = async () => {
  try {
    // Connexion à la base
    await mongoose.connect(process.env.MDB_URLS);
    console.log('✅ Connecté à MongoDB');

    // Supprimer l'admin existant si besoin
    await User.deleteOne({ email: 'admin@adlam.com' });

    // Créer l'admin
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@adlam.com',
      password: hashedPassword,
      role: 'admin'
    });

    console.log('✅ Admin créé avec succès:', admin.email);
    
    // Tester la connexion
    const login = await User.findOne({ email: 'admin@adlam.com' }).select('+password');
    const isValid = await bcrypt.compare('admin123', login.password);
    console.log('✅ Test de connexion:', isValid ? 'Réussi' : 'Échec');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
