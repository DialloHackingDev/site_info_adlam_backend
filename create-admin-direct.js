require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Définition du schéma simple sans middleware
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const createAdmin = async () => {
  try {
    // Connexion à la base
    await mongoose.connect(process.env.MDB_URLS);
    console.log('✅ Connecté à MongoDB');

    // Supprimer l'admin existant si besoin
    await User.deleteOne({ email: 'admin@adlam.com' });

    // Créer l'admin avec mot de passe déjà hashé
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@adlam.com',
      password: hashedPassword,
      role: 'admin'
    });

    console.log('✅ Admin créé avec succès:', admin.email);
    console.log('📧 Email: admin@adlam.com');
    console.log('🔑 Mot de passe: admin123');
    console.log('👤 Rôle:', admin.role);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
