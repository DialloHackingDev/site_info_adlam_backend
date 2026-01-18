const User = require('../models/users.model');
const Article = require('../models/article.model');
const Ebook = require('../models/ebook.model');
const Document = require('../models/document.model');
const Shop = require('../models/shop.model');

// Dashboard - Statistiques générales
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      userStats,
      articleStats,
      ebookStats,
      documentStats,
      shopInfo
    ] = await Promise.all([
      getUserStats(),
      getArticleStats(),
      getEbookStats(),
      getDocumentStats(),
      Shop.findOne()
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        users: userStats,
        articles: articleStats,
        ebooks: ebookStats,
        documents: documentStats,
        shop: shopInfo || null
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

// Gestion des utilisateurs
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (role && role !== 'all') {
      query.role = role;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await User.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: users.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: { users }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Rôle invalide'
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Empêcher la suppression de son propre compte
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'Impossible de supprimer votre propre compte'
      });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Gestion des contenus
exports.getAllContent = async (req, res) => {
  try {
    const { type = 'all', status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let results = {};

    if (type === 'all' || type === 'articles') {
      let articleQuery = {};
      if (status && status !== 'all') {
        articleQuery.status = status;
      }

      const articles = await Article.find(articleQuery)
        .populate('author', 'name email')
        .sort({ createdAt: -1 })
        .limit(type === 'articles' ? parseInt(limit) : 5)
        .skip(type === 'articles' ? skip : 0);

      results.articles = {
        data: articles,
        total: await Article.countDocuments(articleQuery)
      };
    }

    if (type === 'all' || type === 'ebooks') {
      let ebookQuery = {};
      if (status && status !== 'all') {
        ebookQuery.status = status;
      }

      const ebooks = await Ebook.find(ebookQuery)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(type === 'ebooks' ? parseInt(limit) : 5)
        .skip(type === 'ebooks' ? skip : 0);

      results.ebooks = {
        data: ebooks,
        total: await Ebook.countDocuments(ebookQuery)
      };
    }

    if (type === 'all' || type === 'documents') {
      let documentQuery = {};
      if (status && status !== 'all') {
        documentQuery.status = status;
      }

      const documents = await Document.find(documentQuery)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(type === 'documents' ? parseInt(limit) : 5)
        .skip(type === 'documents' ? skip : 0);

      results.documents = {
        data: documents,
        total: await Document.countDocuments(documentQuery)
      };
    }

    res.status(200).json({
      status: 'success',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Fonctions utilitaires
async function getUserStats() {
  const [total, admins, recentUsers] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
  ]);

  return {
    total,
    admins,
    users: total - admins,
    recentUsers
  };
}

async function getArticleStats() {
  const [total, published, drafts, scheduled] = await Promise.all([
    Article.countDocuments(),
    Article.countDocuments({ status: 'published' }),
    Article.countDocuments({ status: 'draft' }),
    Article.countDocuments({ status: 'scheduled' })
  ]);

  return {
    total,
    published,
    drafts,
    scheduled
  };
}

async function getEbookStats() {
  const [total, published, drafts, totalRevenue] = await Promise.all([
    Ebook.countDocuments(),
    Ebook.countDocuments({ status: 'published' }),
    Ebook.countDocuments({ status: 'draft' }),
    Ebook.aggregate([
      { $group: { _id: null, total: { $sum: '$revenue' } } }
    ])
  ]);

  return {
    total,
    published,
    drafts,
    totalRevenue: totalRevenue[0]?.total || 0
  };
}

async function getDocumentStats() {
  const [total, published, drafts] = await Promise.all([
    Document.countDocuments(),
    Document.countDocuments({ status: 'published' }),
    Document.countDocuments({ status: 'draft' })
  ]);

  return {
    total,
    published,
    drafts
  };
}