const Article = require('../models/article.model');
const Ebook = require('../models/ebook.model');
const User = require('../models/users.model');
const cloudinary = require('../config/cloudinary');

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
    console.log('Creating article with data:', req.body);
    console.log('File received:', req.file ? 'Yes' : 'No');
    
    const articleData = { ...req.body, author: req.user._id };
    
    // Générer un slug simple sans dépendance circulaire
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    articleData.slug = `article-${timestamp}-${randomNum}`;
    console.log('Generated slug:', articleData.slug);
    
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
    if (articleData.tags && typeof articleData.tags === 'string') {
      articleData.tags = articleData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    // Supprimer le champ published car on utilise status
    delete articleData.published;
    
    console.log('Final article data:', articleData);
    
    const article = await Article.create(articleData);
    
    res.status(201).json({
      status: 'success',
      data: { article }
    });
  } catch (error) {
    console.error('Create article error:', error);
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
    
    // Upload nouvelle image si fournie
    if (req.file) {
      const article = await Article.findById(req.params.id);
      
      // Supprimer l'ancienne image
      if (article.coverImagePublicId) {
        await cloudinary.uploader.destroy(article.coverImagePublicId);
      }
      
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'adlam/articles',
        resource_type: 'image'
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

    // Supprimer l'image de Cloudinary
    if (article.coverImagePublicId) {
      await cloudinary.uploader.destroy(article.coverImagePublicId);
    }

    await Article.findByIdAndDelete(req.params.id);

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

// Créer un e-book
exports.createEbook = async (req, res) => {
  try {
    console.log('Creating ebook with data:', req.body);
    console.log('Files received:', req.files);
    
    const ebookData = { ...req.body };
    
    // Ajouter les champs requis
    ebookData.createdBy = req.user._id;
    ebookData.slug = `ebook-${Date.now()}`; // Slug temporaire
    ebookData.coverImage = 'https://via.placeholder.com/400x600'; // Image par défaut
    ebookData.coverImagePublicId = 'placeholder';
    ebookData.pdfFile = 'https://via.placeholder.com/file.pdf'; // PDF par défaut
    ebookData.pdfFilePublicId = 'placeholder';
    
    // Convertir les booléens string en booléens
    if (ebookData.featured === 'true') ebookData.featured = true;
    if (ebookData.featured === 'false') ebookData.featured = false;
    if (ebookData.published === 'true') ebookData.published = true;
    if (ebookData.published === 'false') ebookData.published = false;
    
    // Mapper les catégories frontend vers backend
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
    if (ebookData.language === 'fulani') {
      ebookData.language = 'fr'; // Utiliser 'fr' temporairement
    }
    
    // Convertir le prix en nombre
    if (ebookData.price) {
      ebookData.price = parseFloat(ebookData.price);
    }
    
    // Convertir le nombre de pages en nombre
    if (ebookData.pages) {
      ebookData.pages = parseInt(ebookData.pages);
    }
    
    console.log('Final ebook data:', ebookData);
    
    const ebook = await Ebook.create(ebookData);
    
    res.status(201).json({
      status: 'success',
      data: { ebook }
    });
  } catch (error) {
    console.error('Create ebook error:', error);
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
    if (ebook.coverImagePublicId) {
      await cloudinary.uploader.destroy(ebook.coverImagePublicId);
    }
    if (ebook.filePublicId) {
      await cloudinary.uploader.destroy(ebook.filePublicId);
    }

    await Ebook.findByIdAndDelete(req.params.id);

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