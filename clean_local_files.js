const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connecté à MongoDB\n');
    
    const Article = mongoose.model('Article', new mongoose.Schema({}, { strict: false }));
    const Ebook = mongoose.model('Ebook', new mongoose.Schema({}, { strict: false }));
    
    // Trouver articles avec URLs locales
    const articlesWithLocalImages = await Article.find({
      $or: [
        { coverImage: { $regex: '^/uploads/' } },
        { coverImage: { $regex: 'localhost' } },
        { coverImage: { $regex: '^uploads/' } },
        { coverImage: { $not: { $regex: 'cloudinary.com' } } }
      ]
    });
    
    // Trouver ebooks avec URLs locales
    const ebooksWithLocalImages = await Ebook.find({
      $or: [
        { coverImage: { $regex: '^/uploads/' } },
        { coverImage: { $regex: 'localhost' } },
        { pdfFile: { $regex: '^/uploads/' } },
        { pdfFile: { $regex: 'localhost' } },
        { coverImage: { $not: { $regex: 'cloudinary.com' } } }
      ]
    });
    
    console.log(`📊 Articles avec images locales: ${articlesWithLocalImages.length}`);
    console.log(`📊 Ebooks avec fichiers locaux: ${ebooksWithLocalImages.length}\n`);
    
    if (articlesWithLocalImages.length > 0) {
      console.log('🗑️  Suppression des articles avec images locales...\n');
      
      for (const article of articlesWithLocalImages) {
        console.log(`   Suppression: ${article.title}`);
        await Article.findByIdAndDelete(article._id);
      }
      
      console.log(`\n✅ ${articlesWithLocalImages.length} articles supprimés\n`);
    }
    
    if (ebooksWithLocalImages.length > 0) {
      console.log('🗑️  Suppression des ebooks avec fichiers locaux...\n');
      
      for (const ebook of ebooksWithLocalImages) {
        console.log(`   Suppression: ${ebook.title}`);
        await Ebook.findByIdAndDelete(ebook._id);
      }
      
      console.log(`\n✅ ${ebooksWithLocalImages.length} ebooks supprimés\n`);
    }
    
    if (articlesWithLocalImages.length === 0 && ebooksWithLocalImages.length === 0) {
      console.log('✅ Aucun contenu avec fichiers locaux!\n');
      console.log('🎉 Tous les articles et ebooks utilisent Cloudinary!\n');
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('✅ NETTOYAGE TERMINÉ!\n');
      console.log('📝 Prochaines étapes:');
      console.log('   1. Créer de nouveaux articles via Dashboard Admin');
      console.log('   2. Les images iront automatiquement sur Cloudinary');
      console.log('   3. Vider le cache navigateur (Ctrl+Shift+R)\n');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
