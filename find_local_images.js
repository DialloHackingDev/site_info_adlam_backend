const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connecté à MongoDB\n');
    
    const Article = mongoose.model('Article', new mongoose.Schema({}, { strict: false }));
    
    // Chercher tous les patterns possibles d'URLs locales
    const articles = await Article.find({
      $or: [
        { coverImage: { $regex: '^/uploads/' } },
        { coverImage: { $regex: 'localhost' } },
        { coverImage: { $regex: '^uploads/' } },
        { coverImage: { $regex: 'article-' } }
      ]
    });
    
    console.log(`📊 ${articles.length} articles avec images locales trouvés\n`);
    
    if (articles.length > 0) {
      console.log('Liste des articles à corriger:\n');
      articles.forEach((article, index) => {
        console.log(`${index + 1}. ID: ${article._id}`);
        console.log(`   Titre: ${article.title}`);
        console.log(`   Image: ${article.coverImage}`);
        console.log(`   Slug: ${article.slug}\n`);
      });
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('⚠️  SOLUTION IMMÉDIATE:');
      console.log('   Ces articles doivent être supprimés ou réédités\n');
      console.log('Option 1 - SUPPRIMER (si pas importants):');
      console.log('   Dashboard Admin → Articles → Supprimer ces articles\n');
      console.log('Option 2 - RÉÉDITER (si importants):');
      console.log('   Dashboard Admin → Articles → Modifier');
      console.log('   → Réuploader l\'image (ira sur Cloudinary)');
      console.log('   → Sauvegarder\n');
    } else {
      console.log('✅ Aucun article avec images locales!\n');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
