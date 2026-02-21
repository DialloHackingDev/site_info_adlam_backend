require('dotenv').config();
const mongoose = require('mongoose');
const Article = require('../models/article.model');
const Ebook = require('../models/ebook.model');

async function fixImageUrls() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Corriger les URLs des articles
    const articles = await Article.find({ coverImage: { $exists: true, $ne: null } });
    console.log(`\n📄 ${articles.length} articles trouvés avec des images`);

    for (const article of articles) {
      const oldUrl = article.coverImage;
      
      // Extraire juste le préfixe, timestamp et extension
      // Exemple: http://localhost:5000/uploads/article-1771007098895-á¯ á© áª.jpeg
      // Devient: http://localhost:5000/uploads/article-1771007098895.jpeg
      const match = oldUrl.match(/(article-\d+)[-.].*?(\.\w+)$/);
      
      if (match) {
        const newUrl = oldUrl.replace(match[0], `${match[1]}${match[2]}`);
        
        if (oldUrl !== newUrl) {
          article.coverImage = newUrl;
          await article.save();
          console.log(`✅ Article "${article.title.substring(0, 30)}..."`);
          console.log(`   Ancien: ${oldUrl}`);
          console.log(`   Nouveau: ${newUrl}`);
        }
      }
    }

    // Corriger les URLs des ebooks
    const ebooks = await Ebook.find({ coverImage: { $exists: true, $ne: null } });
    console.log(`\n📚 ${ebooks.length} ebooks trouvés avec des images`);

    for (const ebook of ebooks) {
      const oldUrl = ebook.coverImage;
      const match = oldUrl.match(/(cover-\d+)[-.].*?(\.\w+)$/);
      
      if (match) {
        const newUrl = oldUrl.replace(match[0], `${match[1]}${match[2]}`);
        
        if (oldUrl !== newUrl) {
          ebook.coverImage = newUrl;
          await ebook.save();
          console.log(`✅ Ebook "${ebook.title.substring(0, 30)}..."`);
          console.log(`   Ancien: ${oldUrl}`);
          console.log(`   Nouveau: ${newUrl}`);
        }
      }

      // Corriger aussi le PDF
      if (ebook.pdfFile) {
        const oldPdfUrl = ebook.pdfFile;
        const pdfMatch = oldPdfUrl.match(/(pdf-\d+)[-.].*?(\.\w+)$/);
        
        if (pdfMatch) {
          const newPdfUrl = oldPdfUrl.replace(pdfMatch[0], `${pdfMatch[1]}${pdfMatch[2]}`);
          
          if (oldPdfUrl !== newPdfUrl) {
            ebook.pdfFile = newPdfUrl;
            await ebook.save();
            console.log(`   PDF corrigé: ${newPdfUrl}`);
          }
        }
      }
    }

    console.log('\n✅ Migration terminée avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

fixImageUrls();
