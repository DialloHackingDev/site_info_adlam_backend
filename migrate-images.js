require('dotenv').config();
const mongoose = require('mongoose');
const Article = require('./models/article.model');

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/adlam')
  .then(() => console.log('✅ Connecté à MongoDB'))
  .catch(err => {
    console.error('❌ Erreur connexion MongoDB:', err);
    process.exit(1);
  });

const migrateArticleImages = async () => {
  try {
    console.log('🔄 Début de la migration des URLs d\'images...\n');

    // Trouver tous les articles avec des URLs localhost
    const articles = await Article.find({
      coverImage: { $regex: /^http:\/\/localhost/ }
    });

    console.log(`📊 ${articles.length} articles trouvés avec des URLs localhost\n`);

    if (articles.length === 0) {
      console.log('✅ Aucune migration nécessaire !');
      process.exit(0);
    }

    let updated = 0;
    let errors = 0;

    for (const article of articles) {
      try {
        // Extraire le nom du fichier de l'URL localhost
        const filename = article.coverImage.split('/').pop();
        
        console.log(`⚠️  Article: ${article.title}`);
        console.log(`   Ancienne URL: ${article.coverImage}`);
        console.log(`   Fichier: ${filename}`);
        console.log(`   ⚠️  Image locale - sera perdue sur Render`);
        console.log(`   💡 Solution: Re-uploader l'image depuis l'admin\n`);
        
        updated++;
      } catch (error) {
        console.error(`❌ Erreur pour l'article ${article._id}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 RÉSUMÉ:');
    console.log(`   Total: ${articles.length} articles`);
    console.log(`   Analysés: ${updated}`);
    console.log(`   Erreurs: ${errors}`);
    console.log('\n⚠️  IMPORTANT:');
    console.log('   Les images locales seront perdues sur Render.');
    console.log('   Vous devez re-uploader les images depuis l\'interface admin.');
    console.log('   Les nouveaux uploads iront automatiquement sur Cloudinary.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
};

migrateArticleImages();
