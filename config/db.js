require("dotenv").config();
const mongoose = require("mongoose");

const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/adlam";

// Configuration de connexion simplifiée pour MongoDB Atlas
const connectDB = async () => {
  try {
    const options = {
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    };

    await mongoose.connect(mongoURI, options);
    console.log("✅ Connexion DB réussie!");
  } catch (error) {
    console.error("❌ Connexion DB échouée:", error.message);
    console.log("🔄 Tentative de reconnexion dans 5 secondes...");
    setTimeout(connectDB, 5000);
  }
};

// Gestion des événements MongoDB
mongoose.connection.on('error', (err) => {
  console.error('❌ Erreur MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB déconnecté');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnecté');
});

connectDB();

module.exports = mongoose;