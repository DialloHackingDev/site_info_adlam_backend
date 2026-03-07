#!/usr/bin/env node

/**
 * Script de test de connexion Cloudinary
 * Usage: node test-cloudinary.js
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;

console.log('\n🔍 Test de connexion Cloudinary\n');
console.log('━'.repeat(50));

// Afficher la configuration (masquer les secrets)
console.log('\n📋 Configuration détectée:');
console.log('━'.repeat(50));
console.log(`Cloud Name: ${process.env.CLOUDINARY_CLOUDNAME || '❌ NON DÉFINI'}`);
console.log(`API Key: ${process.env.CLOUDINARY_API_KEY ? '✅ Défini (' + process.env.CLOUDINARY_API_KEY.substring(0, 6) + '...)' : '❌ NON DÉFINI'}`);
console.log(`API Secret: ${process.env.CLOUDINARY_API_SECRET ? '✅ Défini (***masqué***)' : '❌ NON DÉFINI'}`);

// Vérifier les underscores dans le cloud_name
if (process.env.CLOUDINARY_CLOUDNAME && process.env.CLOUDINARY_CLOUDNAME.includes('_')) {
  console.log('\n⚠️  ATTENTION: Le cloud_name contient des underscores (_)');
  console.log('   Cloudinary n\'accepte PAS les underscores dans les cloud_name !');
  console.log(`   Actuel: ${process.env.CLOUDINARY_CLOUDNAME}`);
  console.log(`   Suggestion: ${process.env.CLOUDINARY_CLOUDNAME.replace(/_/g, '-')}`);
}

// Configurer Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUDNAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('\n🔌 Test de connexion...');
console.log('━'.repeat(50));

// Tester la connexion
cloudinary.api.ping()
  .then((result) => {
    console.log('✅ SUCCÈS: Cloudinary est connecté !');
    console.log('   Status:', result.status);
    console.log('\n✨ Vous pouvez maintenant uploader des fichiers.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ ERREUR: Impossible de se connecter à Cloudinary');
    console.error('   Message:', error.message);
    
    if (error.message.includes('Invalid cloud_name')) {
      console.error('\n💡 Solution:');
      console.error('   1. Vérifiez votre cloud_name sur https://cloudinary.com/console');
      console.error('   2. Le cloud_name ne doit PAS contenir d\'underscore (_)');
      console.error('   3. Mettez à jour CLOUDINARY_CLOUDNAME dans votre .env');
    } else if (error.message.includes('Invalid API key')) {
      console.error('\n💡 Solution:');
      console.error('   1. Vérifiez votre API Key sur https://cloudinary.com/console');
      console.error('   2. Mettez à jour CLOUDINARY_API_KEY dans votre .env');
    } else if (error.message.includes('Invalid API secret')) {
      console.error('\n💡 Solution:');
      console.error('   1. Vérifiez votre API Secret sur https://cloudinary.com/console');
      console.error('   2. Mettez à jour CLOUDINARY_API_SECRET dans votre .env');
    }
    
    console.error('\n📚 Documentation: https://cloudinary.com/documentation\n');
    process.exit(1);
  });
