// Migration ponctuelle, sans risque si relancée :
// 1. recrée les index texte des e-books et documents pour que la langue 'pular' soit acceptée
// 2. renseigne publishedAt (= createdAt) pour les e-books et articles publiés qui n'en ont pas
// Usage : node scripts/migrate-db.js
require('dotenv').config();
const mongoose = require('mongoose');
const Ebook = require('../models/ebook.model');
const Article = require('../models/article.model');
const Document = require('../models/document.model');

const TEXT_LANGUAGE_OVERRIDE = 'textSearchLanguage';

// Supprime l'ancien index texte (qui lisait le champ 'language') puis recrée les index du schéma
const rebuildTextIndex = async (Model) => {
  const indexes = await Model.collection.indexes().catch(() => []);
  for (const index of indexes) {
    const isText = Object.values(index.key).includes('text') || index.key._fts;
    if (isText && index.language_override !== TEXT_LANGUAGE_OVERRIDE) {
      await Model.collection.dropIndex(index.name);
      console.log(`🗑️  ${Model.modelName} : ancien index texte supprimé (${index.name})`);
    }
  }
  await Model.createIndexes();
  console.log(`✅ ${Model.modelName} : index à jour`);
};

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    await rebuildTextIndex(Ebook);
    await rebuildTextIndex(Document);

    const filter = { status: 'published', publishedAt: null };
    const setFromCreatedAt = [{ $set: { publishedAt: '$createdAt' } }];

    const ebooks = await Ebook.updateMany(filter, setFromCreatedAt, { updatePipeline: true });
    const articles = await Article.updateMany(filter, setFromCreatedAt, { updatePipeline: true });

    console.log(`✅ publishedAt renseigné : ${ebooks.modifiedCount} e-book(s), ${articles.modifiedCount} article(s)`);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

migrate();
