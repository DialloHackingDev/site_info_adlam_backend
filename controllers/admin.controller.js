const Article = require('../models/article.model');
const Ebook = require('../models/ebook.model');
const User = require('../models/users.model');
const { cloudinary } = require('../config/cloudinary');

// Statistiques du dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalArticles, totalEbooks, totalUsers, recentArticles] = await Promise.all([
      Article.countDocuments(),
      Ebook.countDocuments(),
      User.countDocuments(),
      Article.find().sort({ createdAt: -1 }).limit(5).select('title createdAt views')
    ]);

    // Calculer les revenus (simulation)
    const totalRevenue = await Ebook.aggregate([
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalArticles,
          totalEbooks,
          totalUsers,
          totalRevenue: totalRevenue[0]?.total || 0
        },
        recentArticles
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

// Créer un article
exports.createArticle = async (req, res) => {
  try {

    const articleData = { ...req.body, author: req.user._id };

    // Upload de l'image de couverture sur Cloudinary
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream({
            folder: 'adlam/articles',
            resource_type: 'image'
          }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }).end(req.file.buffer);
        });
        
        articleData.coverImage = result.secure_url;
        articleData.coverImagePublicId = result.public_id;
      } catch (uploadError) {
        return res.status(400).json({
          status: 'error',
          message: 'Erreur lors de l\'upload de l\'image: ' + uploadError.message
        });
      }
    }

    // Générer un slug simple sans dépendance circulaire
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    articleData.slug = `article-${timestamp}-${randomNum}`;

    // Convertir les booléens string en booléens
    if (articleData.featured === 'true') articleData.featured = true;
    if (articleData.featured === 'false') articleData.featured = false;
    if (articleData.published === 'true') articleData.status = 'published';
    if (articleData.published === 'false') articleData.status = 'draft';

    // Mapper les catégories frontend vers backend
    const categoryMap = {
      'literature': 'litterature',
      'history': 'histoire',
      'education': 'education',
      'culture': 'culture',
      'science': 'science',
      'religion': 'religion'
    };

    if (articleData.category && categoryMap[articleData.category]) {
      articleData.category = categoryMap[articleData.category];
    }

    // Traiter les tags
    if (articleData.tags) {
      if (typeof articleData.tags === 'string') {
        articleData.tags = articleData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      } else if (Array.isArray(articleData.tags)) {
        articleData.tags = articleData.tags.filter(tag => tag && tag.trim() !== '');
      }
    }

    // Traiter les keywords
    if (articleData.keywords) {
      if (typeof articleData.keywords === 'string') {
        articleData.keywords = articleData.keywords.split(',').map(k => k.trim()).filter(k => k);
      } else if (Array.isArray(articleData.keywords)) {
        articleData.keywords = articleData.keywords.filter(k => k && k.trim() !== '');
      }
    }

    // Supprimer le champ published car on utilise status
    delete articleData.published;


    const article = await Article.create(articleData);

    res.status(201).json({
      status: 'success',
      data: { article }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Erreur lors de la création de l\'article'
    });
  }
};

// Mettre à jour un article
exports.updateArticle = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Traiter les tags
    if (updateData.tags) {
      if (typeof updateData.tags === 'string') {
        updateData.tags = updateData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      } else if (Array.isArray(updateData.tags)) {
        updateData.tags = updateData.tags.filter(tag => tag && tag.trim() !== '');
      }
    }

    // Traiter les keywords
    if (updateData.keywords) {
      if (typeof updateData.keywords === 'string') {
        updateData.keywords = updateData.keywords.split(',').map(k => k.trim()).filter(k => k);
      } else if (Array.isArray(updateData.keywords)) {
        updateData.keywords = updateData.keywords.filter(k => k && k.trim() !== '');
      }
    }

    // Upload nouvelle image si fournie
    if (req.file) {
      const article = await Article.findById(req.params.id);

      // Supprimer l'ancienne image
      if (article.coverImagePublicId) {
        await cloudinary.uploader.destroy(article.coverImagePublicId);
      }

      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({
          folder: 'adlam/articles',
          resource_type: 'image'
        }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }).end(req.file.buffer);
      });
      
      updateData.coverImage = result.secure_url;
      updateData.coverImagePublicId = result.public_id;
    }

    const article = await Article.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Article non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { article }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Erreur lors de la mise à jour'
    });
  }
};

// Supprimer un article
exports.deleteArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Article non trouvé'
      });
    }

    // Supprimer l'image de Cloudinary si elle existe
    if (article.coverImagePublicId && article.coverImagePublicId !== 'placeholder') {
      try {
        await cloudinary.uploader.destroy(article.coverImagePublicId);
      } catch (deleteError) {
        console.warn('Erreur suppression image:', deleteError.message);
      }
    }

    await Article.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Article supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Erreur lors de la suppression'
    });
  }
};

// Créer un e-book
exports.createEbook = async (req, res) => {
  try {
    
    const ebookData = { ...req.body };
    
    // Ajouter les champs requis
    ebookData.createdBy = req.user._id;
    ebookData.slug = `ebook-${Date.now()}`;
    // Ne pas définir d'image par défaut - sera null si non fournie
    // ebookData.coverImage sera undefined si pas de fichier uploadé
    // ebookData.pdfFile sera undefined si pas de fichier uploadé
    
    // Convertir les booléens
    if (ebookData.featured === 'true') ebookData.featured = true;
    if (ebookData.featured === 'false') ebookData.featured = false;
    if (ebookData.published === 'true') ebookData.status = 'published';
    if (ebookData.published === 'false') ebookData.status = 'draft';
    
    // Mapper les catégories
    const categoryMap = {
      'literature': 'litterature',
      'history': 'histoire',
      'education': 'education',
      'culture': 'culture', 
      'science': 'science',
      'religion': 'religion'
    };
    
    if (ebookData.category && categoryMap[ebookData.category]) {
      ebookData.category = categoryMap[ebookData.category];
    }
    
    // Corriger la langue
    if (ebookData.language === 'fulani' || ebookData.language === 'pular') {
      ebookData.language = 'french'; // Temporairement, utiliser 'french' au lieu de 'pular'
    } else if (!ebookData.language) {
      ebookData.language = 'french'; // Valeur par défaut
    }
    
    // Convertir les nombres
    if (ebookData.price) {
      ebookData.price = parseFloat(ebookData.price) || 0;
    }
    
    if (ebookData.pages) {
      ebookData.pageCount = parseInt(ebookData.pages) || 0;
    }
    
    // Traiter les tags
    if (ebookData.tags) {
      if (typeof ebookData.tags === 'string') {
        ebookData.tags = ebookData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      } else if (Array.isArray(ebookData.tags)) {
        ebookData.tags = ebookData.tags.filter(tag => tag && tag.trim() !== '');
      }
    }

    // Traiter les keywords
    if (ebookData.keywords) {
      if (typeof ebookData.keywords === 'string') {
        ebookData.keywords = ebookData.keywords.split(',').map(k => k.trim()).filter(k => k);
      } else if (Array.isArray(ebookData.keywords)) {
        ebookData.keywords = ebookData.keywords.filter(k => k && k.trim() !== '');
      }
    }
    
    // Traiter les fichiers uploadés sur Cloudinary
    if (req.files) {
      try {
        // Upload image de couverture sur Cloudinary
        if (req.files.coverImage && req.files.coverImage[0]) {
          const coverFile = req.files.coverImage[0];
          const coverResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({
              folder: 'adlam/ebooks/covers',
              resource_type: 'image'
            }, (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }).end(coverFile.buffer);
          });
          
          ebookData.coverImage = coverResult.secure_url;
          ebookData.coverImagePublicId = coverResult.public_id;
        }
        
        // Upload fichier PDF sur Cloudinary
        if (req.files.pdfFile && req.files.pdfFile[0]) {
          const pdfFile = req.files.pdfFile[0];
          const pdfResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({
              folder: 'adlam/ebooks/pdfs',
              resource_type: 'raw'
            }, (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }).end(pdfFile.buffer);
          });
          
          ebookData.pdfFile = pdfResult.secure_url;
          ebookData.pdfFilePublicId = pdfResult.public_id;
          ebookData.fileSize = pdfFile.size;
        }
        
      } catch (fileError) {
        return res.status(400).json({
          status: 'error',
          message: 'Erreur lors du traitement des fichiers: ' + fileError.message
        });
      }
    }
    
    // Supprimer les champs non nécessaires
    delete ebookData.published;
    delete ebookData.pages;
    
    
    const ebook = await Ebook.create(ebookData);
    
    res.status(201).json({
      status: 'success',
      data: { ebook }
    });
  } catch (error) {
    console.error('❌ Erreur création ebook:', error.message);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Erreur lors de la création de l\'e-book'
    });
  }
};

// Mettre à jour un e-book
exports.updateEbook = async (req, res) => {
  try {
    const updateData = { ...req.body };
    const ebook = await Ebook.findById(req.params.id);

    if (!ebook) {
      return res.status(404).json({
        status: 'error',
        message: 'E-book non trouvé'
      });
    }

    // Traiter les tags
    if (updateData.tags) {
      if (typeof updateData.tags === 'string') {
        updateData.tags = updateData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      } else if (Array.isArray(updateData.tags)) {
        updateData.tags = updateData.tags.filter(tag => tag && tag.trim() !== '');
      }
    }

    // Traiter les keywords
    if (updateData.keywords) {
      if (typeof updateData.keywords === 'string') {
        updateData.keywords = updateData.keywords.split(',').map(k => k.trim()).filter(k => k);
      } else if (Array.isArray(updateData.keywords)) {
        updateData.keywords = updateData.keywords.filter(k => k && k.trim() !== '');
      }
    }

    // Upload nouvelle image de couverture
    if (req.files?.coverImage) {
      if (ebook.coverImagePublicId) {
        await cloudinary.uploader.destroy(ebook.coverImagePublicId);
      }

      const coverResult = await cloudinary.uploader.upload(req.files.coverImage[0].path, {
        folder: 'adlam/ebooks/covers',
        resource_type: 'image'
      });
      updateData.coverImage = coverResult.secure_url;
      updateData.coverImagePublicId = coverResult.public_id;
    }

    // Upload nouveau fichier PDF
    if (req.files?.pdfFile) {
      if (ebook.filePublicId) {
        await cloudinary.uploader.destroy(ebook.filePublicId);
      }

      const pdfResult = await cloudinary.uploader.upload(req.files.pdfFile[0].path, {
        folder: 'adlam/ebooks/files',
        resource_type: 'raw'
      });
      updateData.fileUrl = pdfResult.secure_url;
      updateData.filePublicId = pdfResult.public_id;
    }

    const updatedEbook = await Ebook.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { ebook: updatedEbook }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Erreur lors de la mise à jour'
    });
  }
};

// Supprimer un e-book
exports.deleteEbook = async (req, res) => {
  try {
    const ebook = await Ebook.findById(req.params.id);

    if (!ebook) {
      return res.status(404).json({
        status: 'error',
        message: 'E-book non trouvé'
      });
    }

    // Supprimer les fichiers de Cloudinary
    if (ebook.coverImagePublicId && ebook.coverImagePublicId !== 'placeholder') {
      try {
        await cloudinary.uploader.destroy(ebook.coverImagePublicId);
      } catch (deleteError) {
        console.warn('Erreur suppression couverture:', deleteError.message);
      }
    }
    
    if (ebook.pdfFilePublicId && ebook.pdfFilePublicId !== 'placeholder') {
      try {
        await cloudinary.uploader.destroy(ebook.pdfFilePublicId, { resource_type: 'raw' });
      } catch (deleteError) {
        console.warn('Erreur suppression PDF:', deleteError.message);
      }
    }

    await Ebook.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'E-book supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Erreur lors de la suppression'
    });
  }
};

// Gestion des utilisateurs
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des utilisateurs'
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
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
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération de l\'utilisateur'
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role },
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
      message: error.message || 'Erreur lors de la mise à jour'
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    // Empêcher la suppression de son propre compte
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la suppression'
    });
  }
};