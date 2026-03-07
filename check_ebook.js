const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connecté à MongoDB\n');
    
    const Ebook = mongoose.model('Ebook', new mongoose.Schema({}, { strict: false }));
    
    const ebookId = '69ac137658dd48f662c380fd';
    
    // Chercher l'ebook spécifique
    const ebook = await Ebook.findById(ebookId);
    
    if (!ebook) {
      console.log('❌ Ebook non trouvé avec cet ID!\n');
      console.log('🔍 Recherche de tous les ebooks...\n');
      
      const allEbooks = await Ebook.find({});
      console.log(`📚 ${allEbooks.length} ebooks trouvés:\n`);
      
      allEbooks.forEach((eb, index) => {
        console.log(`${index + 1}. ID: ${eb._id}`);
        console.log(`   Titre: ${eb.title}`);
        console.log(`   PDF: ${eb.pdfFile || 'NON DÉFINI'}`);
        console.log(`   Cover: ${eb.coverImage || 'NON DÉFINI'}`);
        console.log(`   Status: ${eb.status}\n`);
      });
    } else {
      console.log('✅ Ebook trouvé!\n');
      console.log(`ID: ${ebook._id}`);
      console.log(`Titre: ${ebook.title}`);
      console.log(`Auteur: ${ebook.author}`);
      console.log(`PDF: ${ebook.pdfFile || '❌ NON DÉFINI'}`);
      console.log(`Cover: ${ebook.coverImage || '❌ NON DÉFINI'}`);
      console.log(`Status: ${ebook.status}`);
      console.log(`Prix: ${ebook.price} GNF\n`);
      
      if (!ebook.pdfFile) {
        console.log('⚠️  PROBLÈME: Le fichier PDF n\'est pas défini!\n');
        console.log('SOLUTION:');
        console.log('1. Aller dans Dashboard Admin → Ebooks');
        console.log('2. Modifier cet ebook');
        console.log('3. Réuploader le fichier PDF');
        console.log('4. Sauvegarder\n');
      } else if (ebook.pdfFile.includes('localhost') || ebook.pdfFile.includes('/uploads/')) {
        console.log('⚠️  PROBLÈME: Le PDF pointe vers un fichier local!\n');
        console.log(`URL actuelle: ${ebook.pdfFile}\n`);
        console.log('SOLUTION:');
        console.log('1. Aller dans Dashboard Admin → Ebooks');
        console.log('2. Modifier cet ebook');
        console.log('3. Réuploader le fichier PDF (ira sur Cloudinary)');
        console.log('4. Sauvegarder\n');
      }
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
