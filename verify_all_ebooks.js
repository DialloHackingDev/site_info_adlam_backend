const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connecté à MongoDB\n');
    
    const Ebook = mongoose.model('Ebook', new mongoose.Schema({}, { strict: false }));
    
    const allEbooks = await Ebook.find({});
    
    console.log(`📚 Total: ${allEbooks.length} ebooks dans la base\n`);
    
    let cloudinaryCount = 0;
    let localCount = 0;
    let missingPdfCount = 0;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    allEbooks.forEach((ebook, index) => {
      const hasCloudinaryPdf = ebook.pdfFile && ebook.pdfFile.includes('cloudinary.com');
      const hasLocalPdf = ebook.pdfFile && (ebook.pdfFile.includes('/uploads/') || ebook.pdfFile.includes('localhost'));
      const noPdf = !ebook.pdfFile;
      
      if (hasCloudinaryPdf) {
        cloudinaryCount++;
        console.log(`✅ ${index + 1}. ${ebook.title}`);
        console.log(`   Status: ${ebook.status} | PDF: Cloudinary ✓`);
      } else if (hasLocalPdf) {
        localCount++;
        console.log(`⚠️  ${index + 1}. ${ebook.title}`);
        console.log(`   Status: ${ebook.status} | PDF: Local (À SUPPRIMER)`);
      } else if (noPdf) {
        missingPdfCount++;
        console.log(`❌ ${index + 1}. ${ebook.title}`);
        console.log(`   Status: ${ebook.status} | PDF: MANQUANT`);
      }
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 RÉSUMÉ:\n');
    console.log(`✅ Ebooks avec Cloudinary: ${cloudinaryCount}`);
    console.log(`⚠️  Ebooks avec fichiers locaux: ${localCount}`);
    console.log(`❌ Ebooks sans PDF: ${missingPdfCount}`);
    console.log(`📚 Total: ${allEbooks.length}\n`);
    
    if (localCount === 0 && missingPdfCount === 0) {
      console.log('🎉 Parfait! Tous les ebooks sont sur Cloudinary!\n');
    } else if (localCount > 0) {
      console.log('⚠️  Action requise: Supprimer ou réuploader les ebooks avec fichiers locaux\n');
    } else if (missingPdfCount > 0) {
      console.log('⚠️  Action requise: Ajouter les PDFs manquants\n');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
