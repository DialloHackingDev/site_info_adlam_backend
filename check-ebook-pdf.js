#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const ebookId = process.argv[2] || '69ac6089fd781cabf80e30f3';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connecté à MongoDB\n');
    
    const Ebook = require('./models/ebook.model');
    const ebook = await Ebook.findById(ebookId);
    
    if (!ebook) {
      console.log('❌ Ebook non trouvé:', ebookId);
      process.exit(1);
    }
    
    console.log('📚 Ebook trouvé:');
    console.log('━'.repeat(50));
    console.log('ID:', ebook._id);
    console.log('Title:', ebook.title);
    console.log('Author:', ebook.author);
    console.log('Price:', ebook.price);
    console.log('');
    console.log('📄 Fichier PDF:');
    console.log('━'.repeat(50));
    console.log('pdfFile:', ebook.pdfFile || '❌ NON DÉFINI');
    console.log('pdfFilePublicId:', ebook.pdfFilePublicId || '❌ NON DÉFINI');
    console.log('');
    console.log('🖼️  Image de couverture:');
    console.log('━'.repeat(50));
    console.log('coverImage:', ebook.coverImage || '❌ NON DÉFINI');
    console.log('coverImagePublicId:', ebook.coverImagePublicId || '❌ NON DÉFINI');
    console.log('');
    
    if (!ebook.pdfFile) {
      console.log('⚠️  PROBLÈME: Le champ pdfFile est vide !');
      console.log('   Cet ebook ne peut pas être lu.');
      console.log('   Solution: Modifier l\'ebook et uploader un fichier PDF.');
    } else if (ebook.pdfFile.includes('cloudinary.com')) {
      console.log('✅ PDF hébergé sur Cloudinary');
      console.log('   URL:', ebook.pdfFile);
    } else {
      console.log('⚠️  PDF en local (peut ne pas exister)');
      console.log('   Path:', ebook.pdfFile);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  });
