// Données de démonstration pour le développement local (fichiers de uploads/, sans Cloudinary).
// Usage : node scripts/seed-local.js   (refuse de tourner hors d'une base locale)
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/users.model');
const Article = require('../models/article.model');
const Ebook = require('../models/ebook.model');

const uri = process.env.MONGODB_URI || '';
if (process.env.NODE_ENV === 'production' || !/127\.0\.0\.1|localhost/.test(uri)) {
  console.error('❌ seed-local ne s\'exécute que sur une base MongoDB locale');
  process.exit(1);
}

const seed = async () => {
  try {
    await mongoose.connect(uri);

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      throw new Error('Créez d\'abord un admin avec create-admin.js');
    }

    await Article.deleteMany({ slug: /^demo-/ });
    await Ebook.deleteMany({ slug: /^demo-/ });

    await Article.create([
      {
        title: '𞤀𞤣𞤤𞤢𞤥 : 𞤶𞤢𞤲𞤺𞤵𞤺𞤮 𞤸𞤢𞤤𞤢𞤲𞤣𞤫',
        slug: 'demo-article-1',
        content: '<p>Premier article de démonstration en Adlam.</p><p>𞤖𞤢𞤤𞤢𞤲𞤣𞤫 𞤆𞤵𞤤𞤢𞤪.</p>',
        excerpt: 'Premier article de démonstration',
        category: 'culture',
        status: 'published',
        featured: true,
        author: admin._id,
        coverImage: '/uploads/article-1769333476475.jpeg'
      },
      {
        title: 'Histoire de l\'écriture Adlam',
        slug: 'demo-article-2',
        content: [
          '<p>L\'alphabet Adlam a été créé à la fin des années 1980 par deux frères guinéens, Ibrahima et Abdoulaye Barry, pour écrire la langue peule avec un système qui lui soit propre.</p>',
          '<h2>Une écriture née d\'un besoin</h2>',
          '<p>Avant Adlam, le peul s\'écrivait surtout avec l\'alphabet arabe (ajami) ou latin, deux systèmes qui ne rendent pas toujours fidèlement ses sons. Les deux frères ont conçu un alphabet de 28 lettres, écrit de droite à gauche.</p>',
          '<blockquote>Une langue qui possède sa propre écriture peut transmettre son savoir sans intermédiaire.</blockquote>',
          '<h2>Une diffusion rapide</h2>',
          '<p>L\'alphabet s\'est d\'abord transmis de main en main, dans les marchés et les familles, avant d\'arriver sur les téléphones :</p>',
          '<ul><li>intégration dans la norme Unicode en 2016 ;</li><li>prise en charge par Android, Windows et macOS ;</li><li>apparition de livres, de journaux et d\'applications d\'apprentissage.</li></ul>',
          '<p>Aujourd\'hui, Adlam est utilisé en Guinée, au Sénégal, au Nigeria et dans la diaspora, et continue de gagner de nouveaux lecteurs chaque année.</p>'
        ].join(''),
        excerpt: 'Origines de l\'alphabet',
        category: 'histoire',
        status: 'published',
        author: admin._id,
        coverImage: '/uploads/article-1769708579626.jpeg'
      },
      {
        title: 'Brouillon non publié',
        slug: 'demo-article-draft',
        content: '<p>Ne doit pas apparaître côté public.</p>',
        category: 'education',
        status: 'draft',
        author: admin._id
      }
    ]);

    await Ebook.create([
      {
        title: 'Livre gratuit de démonstration',
        slug: 'demo-ebook-free',
        description: 'E-book gratuit pour tester la bibliothèque et le lecteur.',
        author: 'Auteur Démo',
        price: 0,
        category: 'education',
        language: 'pular',
        status: 'published',
        featured: true,
        createdBy: admin._id,
        coverImage: '/uploads/cover-1769333697023.jpeg',
        pdfFile: '/uploads/pdf-1769333697024.pdf'
      },
      {
        title: 'Livre payant de démonstration',
        slug: 'demo-ebook-paid',
        description: 'E-book payant pour tester le panier et le paiement simulé.',
        author: 'Auteur Démo',
        price: 25000,
        category: 'litterature',
        language: 'pular',
        status: 'published',
        createdBy: admin._id,
        coverImage: '/uploads/cover-1771074917490.png',
        pdfFile: '/uploads/pdf-1769714766932.pdf'
      }
    ]);

    console.log('✅ Données de démonstration créées (3 articles, 2 e-books)');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seed();
