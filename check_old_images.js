const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connecté à MongoDB');
    
    const Article = mongoose.model('Article', new mongoose.Schema({}, { strict: false }));
    
    // Trouver articles avec URLs locales
    const articles = await Article.find({
      coverImage: { $regex: '^/uploads/' }
    });
    
    console.log(`\n📊 ${articles.length} articles avec images locales trouvés\n`);
    
    if (articles.length > 0) {
      console.log('Liste des articles à mettre à jour:');
      articles.forEach((article, index) => {
        console.log(`${index + 1}. ${article.title}`);
        console.log(`   Image: ${article.coverImage}\n`);
      });
      
      console.log('⚠️  SOLUTION:');
      console.log('   1. Aller dans Dashboard Admin → Articles');
      console.log('   2. Modifier chaque article');
      console.log('   3. Réuploader l\'image (elle ira sur Cloudinary)');
      console.log('   4. Sauvegarder\n');
    } else {
      console.log('✅ Tous les articles utilisent Cloudinary!\n');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
