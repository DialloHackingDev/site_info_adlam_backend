// Crée ou promeut un administrateur.
// Usage : ADMIN_EMAIL=... ADMIN_PASSWORD=... [ADMIN_NAME=...] node create-admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/users.model');

const createAdmin = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Administrateur' } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌ Définissez ADMIN_EMAIL et ADMIN_PASSWORD');
    process.exit(1);
  }
  if (ADMIN_PASSWORD.length < 12) {
    console.error('❌ ADMIN_PASSWORD doit contenir au moins 12 caractères');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Le hook pre('save') du modèle hache le mot de passe : ne pas le hacher ici
    let admin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (admin) {
      admin.password = ADMIN_PASSWORD;
      admin.role = 'admin';
    } else {
      admin = new User({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
    }
    await admin.save();

    console.log('✅ Admin prêt:', admin.email);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
