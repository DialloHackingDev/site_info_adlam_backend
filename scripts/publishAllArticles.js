const mongoose = require('mongoose');
require('dotenv').config();

const publishAllArticles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/adlam');
    console.log('✅ Connecté à MongoDB');

    const Article = require('../models/article.model');
    
    // Mettre à jour tous les articles draft en published
    const result = await Article.updateMany(
      { status: 'draft' },
      { 
        status: 'published',
        publishedAt: new Date()
      }
    );

    console.log(`✅ ${result.modifiedCount} articles publiés avec succès`);
    
    // Afficher les articles mis à jour
    const articles = await Article.find({ status: 'published' }).select('title status publishedAt');
    console.log('\n📊 Articles publiés:');
    articles.forEach(a => {
      console.log(`- ${a.title}: status=${a.status}, publishedAt=${a.publishedAt}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

publishAllArticles();
