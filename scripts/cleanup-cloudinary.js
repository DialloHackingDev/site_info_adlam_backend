const { cloudinary } = require('../config/cloudinary');
const Article = require('../models/article.model');
const Ebook = require('../models/ebook.model');

/**
 * Script pour nettoyer les fichiers orphelins sur Cloudinary
 * Usage: node scripts/cleanup-cloudinary.js
 */

async function getCloudinaryFiles(folder, resourceType = 'image') {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      resource_type: resourceType,
      max_results: 500
    });
    return result.resources.map(r => r.public_id);
  } catch (error) {
    console.error(`Erreur récupération fichiers ${folder}:`, error.message);
    return [];
  }
}

async function getUsedPublicIds(model, field) {
  try {
    const docs = await model.find({ [field]: { $exists: true, $ne: null } }).select(field);
    return docs.map(doc => doc[field]).filter(Boolean);
  } catch (error) {
    console.error(`Erreur récupération ${field}:`, error.message);
    return [];
  }
}

async function cleanupArticleImages() {
  console.log('\n🔍 Vérification des images d\'articles...');
  
  const cloudinaryFiles = await getCloudinaryFiles('adlam/articles');
  const usedPublicIds = await getUsedPublicIds(Article, 'coverImagePublicId');
  
  const orphans = cloudinaryFiles.filter(id => !usedPublicIds.includes(id));
  
  console.log(`📊 Images sur Cloudinary: ${cloudinaryFiles.length}`);
  console.log(`✅ Images utilisées: ${usedPublicIds.length}`);
  console.log(`🗑️  Images orphelines: ${orphans.length}`);
  
  if (orphans.length > 0) {
    console.log('\n⚠️  Images orphelines détectées:');
    orphans.forEach(id => console.log(`   - ${id}`));
    
    // Décommenter pour supprimer automatiquement
    // for (const publicId of orphans) {
    //   try {
    //     await cloudinary.uploader.destroy(publicId);
    //     console.log(`✅ Supprimé: ${publicId}`);
    //   } catch (error) {
    //     console.error(`❌ Erreur suppression ${publicId}:`, error.message);
    //   }
    // }
  }
  
  return orphans;
}

async function cleanupEbookCovers() {
  console.log('\n🔍 Vérification des couvertures d\'ebooks...');
  
  const cloudinaryFiles = await getCloudinaryFiles('adlam/ebooks/covers');
  const usedPublicIds = await getUsedPublicIds(Ebook, 'coverImagePublicId');
  
  const orphans = cloudinaryFiles.filter(id => !usedPublicIds.includes(id));
  
  console.log(`📊 Couvertures sur Cloudinary: ${cloudinaryFiles.length}`);
  console.log(`✅ Couvertures utilisées: ${usedPublicIds.length}`);
  console.log(`🗑️  Couvertures orphelines: ${orphans.length}`);
  
  if (orphans.length > 0) {
    console.log('\n⚠️  Couvertures orphelines détectées:');
    orphans.forEach(id => console.log(`   - ${id}`));
  }
  
  return orphans;
}

async function cleanupEbookPdfs() {
  console.log('\n🔍 Vérification des PDFs d\'ebooks...');
  
  const cloudinaryFiles = await getCloudinaryFiles('adlam/ebooks/pdfs', 'raw');
  const usedPublicIds = await getUsedPublicIds(Ebook, 'pdfFilePublicId');
  
  const orphans = cloudinaryFiles.filter(id => !usedPublicIds.includes(id));
  
  console.log(`📊 PDFs sur Cloudinary: ${cloudinaryFiles.length}`);
  console.log(`✅ PDFs utilisés: ${usedPublicIds.length}`);
  console.log(`🗑️  PDFs orphelins: ${orphans.length}`);
  
  if (orphans.length > 0) {
    console.log('\n⚠️  PDFs orphelins détectés:');
    orphans.forEach(id => console.log(`   - ${id}`));
  }
  
  return orphans;
}

async function getCloudinaryStats() {
  try {
    const usage = await cloudinary.api.usage();
    console.log('\n📊 STATISTIQUES CLOUDINARY');
    console.log('═══════════════════════════');
    console.log(`Stockage utilisé: ${(usage.storage.usage / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Limite: ${(usage.storage.limit / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Pourcentage: ${((usage.storage.usage / usage.storage.limit) * 100).toFixed(2)}%`);
    console.log(`Ressources: ${usage.resources}`);
    console.log(`Bande passante: ${(usage.bandwidth.usage / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('Erreur récupération stats:', error.message);
  }
}

async function main() {
  console.log('🚀 NETTOYAGE CLOUDINARY');
  console.log('═══════════════════════════════════════');
  
  try {
    // Connexion à la base de données
    require('dotenv').config();
    require('../config/db');
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre la connexion
    
    // Statistiques
    await getCloudinaryStats();
    
    // Vérifications
    const articleOrphans = await cleanupArticleImages();
    const coverOrphans = await cleanupEbookCovers();
    const pdfOrphans = await cleanupEbookPdfs();
    
    const totalOrphans = articleOrphans.length + coverOrphans.length + pdfOrphans.length;
    
    console.log('\n═══════════════════════════════════════');
    console.log(`🗑️  TOTAL FICHIERS ORPHELINS: ${totalOrphans}`);
    
    if (totalOrphans > 0) {
      console.log('\n💡 Pour supprimer automatiquement, décommentez le code dans le script');
    } else {
      console.log('\n✅ Aucun fichier orphelin détecté !');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = {
  cleanupArticleImages,
  cleanupEbookCovers,
  cleanupEbookPdfs,
  getCloudinaryStats
};
