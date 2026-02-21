require('dotenv').config();
const mongoose = require('mongoose');
const Article = require('../models/article.model');
const Ebook = require('../models/ebook.model');

async function cleanPublicIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Nettoyer les publicIds des articles
    const articles = await Article.find({ coverImagePublicId: { $exists: true, $ne: null } });
    console.log(`\n📄 ${articles.length} articles avec coverImagePublicId`);

    for (const article of articles) {
      const oldPublicId = article.coverImagePublicId;
      
      // Extraire juste le préfixe, timestamp et extension
      const match = oldPublicId.match(/(article-\d+)[-.].*?(\.\w+)$/);
      
      if (match) {
        const newPublicId = `${match[1]}${match[2]}`;
        
        if (oldPublicId !== newPublicId) {
          article.coverImagePublicId = newPublicId;
          await article.save();
          console.log(`✅ Article "${article.title.substring(0, 30)}..."`);
          console.log(`   PublicId: ${oldPublicId} → ${newPublicId}`);
        }
      }
    }

    // Nettoyer les publicIds des ebooks
    const ebooks = await Ebook.find({ coverImagePublicId: { $exists: true, $ne: null } });
    console.log(`\n📚 ${ebooks.length} ebooks avec coverImagePublicId`);

    for (const ebook of ebooks) {
      const oldPublicId = ebook.coverImagePublicId;
      const match = oldPublicId.match(/(cover-\d+)[-.].*?(\.\w+)$/);
      
      if (match) {
        const newPublicId = `${match[1]}${match[2]}`;
        
        if (oldPublicId !== newPublicId) {
          ebook.coverImagePublicId = newPublicId;
          await ebook.save();
          console.log(`✅ Ebook "${ebook.title.substring(0, 30)}..."`);
          console.log(`   PublicId: ${oldPublicId} → ${newPublicId}`);
        }
      }
    }

    console.log('\n✅ Nettoyage des publicIds terminé !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

cleanPublicIds();
