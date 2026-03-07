const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connecté à MongoDB\n');
    
    const Ebook = mongoose.model('Ebook', new mongoose.Schema({}, { strict: false }));
    
    // Chercher tous les ebooks avec fichiers locaux
    const ebooksWithLocalFiles = await Ebook.find({
      $or: [
        { pdfFile: { $regex: '^/uploads/' } },
        { pdfFile: { $regex: 'localhost' } },
        { pdfFile: { $regex: '^uploads/' } },
        { coverImage: { $regex: '^/uploads/' } },
        { coverImage: { $regex: 'localhost' } },
        { coverImage: { $regex: '^uploads/' } }
      ]
    });
    
    console.log(`📊 ${ebooksWithLocalFiles.length} ebooks avec fichiers locaux trouvés\n`);
    
    if (ebooksWithLocalFiles.length > 0) {
      console.log('Liste des ebooks à supprimer:\n');
      ebooksWithLocalFiles.forEach((ebook, index) => {
        console.log(`${index + 1}. ID: ${ebook._id}`);
        console.log(`   Titre: ${ebook.title}`);
        console.log(`   PDF: ${ebook.pdfFile}`);
        console.log(`   Cover: ${ebook.coverImage}`);
        console.log(`   Status: ${ebook.status}\n`);
      });
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('⚠️  SUPPRESSION EN COURS...\n');
      
      for (const ebook of ebooksWithLocalFiles) {
        await Ebook.deleteOne({ _id: ebook._id });
        console.log(`✅ Supprimé: ${ebook.title} (${ebook._id})`);
      }
      
      console.log(`\n✅ ${ebooksWithLocalFiles.length} ebooks supprimés avec succès!\n`);
      console.log('💡 Ces ebooks doivent être recréés avec de nouveaux fichiers uploadés sur Cloudinary.\n');
    } else {
      console.log('✅ Aucun ebook avec fichiers locaux!\n');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
