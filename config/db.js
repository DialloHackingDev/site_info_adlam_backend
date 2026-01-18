require("dotenv").config();
const mongoose = require("mongoose");

const mongoURI = process.env.MDB_URLS || "mongodb://localhost:27017/dbAdlam";

// Configuration de connexion simplifiée
const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    await mongoose.connect(mongoURI, options);
    console.log("✅ Connexion DB réussie!");
  } catch (error) {
    console.error("❌ Connexion DB échouée:", error.message);
  }
};

connectDB();

module.exports = mongoose;