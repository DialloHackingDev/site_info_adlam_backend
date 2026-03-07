const Ebook = require('../models/ebook.model');
const EbookFileService = require('../services/ebook-file.service');

// Créer un e-book
exports.createEbook = async (req, res) => {
  try {
    const {
      title,
      description,
      author,
      price,
      currency,
      category,
      tags,
      previewPages,
      language,
      metaTitle,
      metaDescription,
      keywords,
      status
    } = req.body;

    // Vérifier que les fichiers requis sont présents
    if (!req.files || !req.files.coverImage || !req.files.pdfFile) {
      return res.status(400).json({
        status: 'error',
        message: 'Couverture et fichier PDF sont obligatoires'
      });
    }

    // Traiter les fichiers uploadés
    const fileResults = await EbookFileService.processEbookFiles(req.files);

    const ebookData = {
      title,
      description,
      author,
      price: parseFloat(price) || 0,
      currency: currency || 'GNF',
      category,
      tags: Array.isArray(tags) ? tags.filter(tag => tag && tag.trim() !== '') : (tags ? tags.split(',').map(t => t.trim()).filter(t => t) : []),
      previewPages: parseInt(previewPages) || 10,
      language: language || 'pular',
      metaTitle,
      metaDescription,
      keywords: Array.isArray(keywords) ? keywords.filter(keyword => keyword && keyword.trim() !== '') : (keywords ? keywords.split(',').map(k => k.trim()).filter(k => k) : []),
      status: status || 'draft',
      createdBy: req.user._id,
      // Fichiers
      coverImage: fileResults.cover.url,
      coverImagePublicId: fileResults.cover.publicId,
      pdfFile: fileResults.pdf.url,
      pdfFilePublicId: fileResults.pdf.publicId,
      fileSize: fileResults.pdf.bytes,
      pageCount: fileResults.pdf.pages || 0,
      previewUrl: fileResults.pdf.previewUrl
    };

    const ebook = await Ebook.create(ebookData);

    res.status(201).json({
      status: 'success',
      data: { ebook: ebook.getPublicData() }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir tous les e-books avec filtres
exports.getAllEbooks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      sort = 'newest',
      minPrice,
      maxPrice,
      featured,
      language
    } = req.query;

    const skip = (page - 1) * limit;
    
    let query = {};
    let sortOptions = {};

    // Filtres de base
    if (!req.user || req.user.role !== 'admin') {
      query.status = 'published';
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (language && language !== 'all') {
      query.language = language;
    }

    if (featured !== undefined) {
      query.featured = featured === 'true';
    }

    // Filtre de prix
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Options de tri
    switch (sort) {
      case 'newest':
        sortOptions = { publishedAt: -1 };
        break;
      case 'oldest':
        sortOptions = { publishedAt: 1 };
        break;
      case 'price_low':
        sortOptions = { price: 1 };
        break;
      case 'price_high':
        sortOptions = { price: -1 };
        break;
      case 'popular':
        sortOptions = { sales: -1, downloads: -1 };
        break;
      case 'rating':
        sortOptions = { 'rating.average': -1, 'rating.count': -1 };
        break;
      default:
        sortOptions = { publishedAt: -1 };
    }

    let ebooks;
    let total;

    if (search) {
      // Recherche textuelle
      ebooks = await Ebook.searchEbooks(search, {
        category,
        limit: parseInt(limit),
        skip,
        priceRange: (minPrice || maxPrice) ? { min: minPrice || 0, max: maxPrice || 999999 } : null
      });
      total = await Ebook.countDocuments({
        ...query,
        $text: { $search: search }
      });
    } else {
      // Requête normale
      ebooks = await Ebook.find(query)
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(skip);
      
      total = await Ebook.countDocuments(query);
    }

    res.status(200).json({
      status: 'success',
      results: ebooks.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: { 
        ebooks: ebooks.map(ebook => ebook.getPublicData ? ebook.getPublicData() : ebook)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir un e-book par ID
exports.getEbookById = async (req, res) => {
  try {
    const { id } = req.params;

    const ebook = await Ebook.findById(id);

    if (!ebook) {
      return res.status(404).json({
        status: 'error',
        message: 'E-book non trouvé'
      });
    }

    // Vérifier les permissions pour les e-books non publiés
    if (ebook.status !== 'published' && 
        (!req.user || (req.user._id.toString() !== ebook.createdBy.toString() && req.user.role !== 'admin'))) {
      return res.status(403).json({
        status: 'error',
        message: 'Accès non autorisé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { ebook: ebook.getPublicData ? ebook.getPublicData() : ebook }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir un e-book par slug
exports.getEbookBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const ebook = await Ebook.findOne({ slug });

    if (!ebook) {
      return res.status(404).json({
        status: 'error',
        message: 'E-book non trouvé'
      });
    }

    // Vérifier les permissions pour les e-books non publiés
    if (ebook.status !== 'published' && 
        (!req.user || (req.user._id.toString() !== ebook.createdBy.toString() && req.user.role !== 'admin'))) {
      return res.status(403).json({
        status: 'error',
        message: 'Accès non autorisé'
      });
    }

    // Incrémenter les vues (seulement pour les e-books publiés)
    if (ebook.status === 'published') {
      await ebook.incrementViews();
    }

    res.status(200).json({
      status: 'success',
      data: { ebook: ebook.getPublicData() }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les e-books récents
exports.getRecentEbooks = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const ebooks = await Ebook.getRecent(parseInt(limit));

    res.status(200).json({
      status: 'success',
      results: ebooks.length,
      data: { ebooks: ebooks.map(ebook => ebook.getPublicData()) }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les e-books en vedette
exports.getFeaturedEbooks = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const ebooks = await Ebook.getFeatured(parseInt(limit));

    res.status(200).json({
      status: 'success',
      results: ebooks.length,
      data: { ebooks: ebooks.map(ebook => ebook.getPublicData()) }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les best-sellers
exports.getBestSellers = async (req, res) => {
  try {
    const { limit = 10, days = 30 } = req.query;

    const ebooks = await Ebook.getBestSellers(parseInt(limit), parseInt(days));

    res.status(200).json({
      status: 'success',
      results: ebooks.length,
      data: { ebooks: ebooks.map(ebook => ebook.getPublicData()) }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les e-books par catégorie
exports.getEbooksByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const ebooks = await Ebook.getByCategory(category, {
      limit: parseInt(limit),
      skip: (page - 1) * limit
    });

    const total = await Ebook.countDocuments({
      status: 'published',
      category
    });

    res.status(200).json({
      status: 'success',
      results: ebooks.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: { ebooks: ebooks.map(ebook => ebook.getPublicData()) }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Mettre à jour un e-book
exports.updateEbook = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const ebook = await Ebook.findById(id);

    if (!ebook) {
      return res.status(404).json({
        status: 'error',
        message: 'E-book non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && ebook.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Non autorisé à modifier cet e-book'
      });
    }

    // Traiter les nouveaux fichiers si fournis
    if (req.files && (req.files.coverImage || req.files.pdfFile)) {
      const fileResults = await EbookFileService.updateEbookFiles(req.files, ebook);
      
      if (fileResults.cover) {
        updates.coverImage = fileResults.cover.url;
        updates.coverImagePublicId = fileResults.cover.publicId;
      }
      
      if (fileResults.pdf) {
        updates.pdfFile = fileResults.pdf.url;
        updates.pdfFilePublicId = fileResults.pdf.publicId;
        updates.fileSize = fileResults.pdf.bytes;
        updates.pageCount = fileResults.pdf.pages || 0;
        updates.previewUrl = fileResults.pdf.previewUrl;
      }
    }

    // Normaliser les tableaux (tags et keywords)
    if (updates.tags) {
      if (typeof updates.tags === 'string') {
        try {
          updates.tags = JSON.parse(updates.tags);
        } catch (e) {
          updates.tags = updates.tags.split(',').map(t => t.trim());
        }
      }
      updates.tags = Array.isArray(updates.tags) ? updates.tags.filter(tag => tag && tag.trim() !== '') : [];
    }
    if (updates.keywords) {
      if (typeof updates.keywords === 'string') {
        try {
          updates.keywords = JSON.parse(updates.keywords);
        } catch (e) {
          updates.keywords = updates.keywords.split(',').map(k => k.trim());
        }
      }
      updates.keywords = Array.isArray(updates.keywords) ? updates.keywords.filter(keyword => keyword && keyword.trim() !== '') : [];
    }

    // Convertir price en nombre si c'est une chaîne
    if (updates.price && typeof updates.price === 'string') {
      updates.price = parseFloat(updates.price);
    }
    if (updates.previewPages && typeof updates.previewPages === 'string') {
      updates.previewPages = parseInt(updates.previewPages);
    }

    const updatedEbook = await Ebook.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { ebook: updatedEbook.getPublicData() }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Supprimer un e-book
exports.deleteEbook = async (req, res) => {
  try {
    const { id } = req.params;

    const ebook = await Ebook.findById(id);

    if (!ebook) {
      return res.status(404).json({
        status: 'error',
        message: 'E-book non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && ebook.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Non autorisé à supprimer cet e-book'
      });
    }

    // Supprimer les fichiers de Cloudinary
    if (ebook.coverImagePublicId) {
      try {
        await EbookFileService.deleteFile(ebook.coverImagePublicId);
      } catch (deleteError) {
        console.error('Erreur suppression couverture:', deleteError);
      }
    }
    if (ebook.pdfFilePublicId) {
      try {
        await EbookFileService.deleteFile(ebook.pdfFilePublicId, 'raw');
      } catch (deleteError) {
        console.error('Erreur suppression PDF:', deleteError);
      }
    }

    await Ebook.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'E-book supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Basculer le statut featured
exports.toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const ebook = await Ebook.findById(id);

    if (!ebook) {
      return res.status(404).json({
        status: 'error',
        message: 'E-book non trouvé'
      });
    }

    await ebook.toggleFeatured();

    res.status(200).json({
      status: 'success',
      data: {
        featured: ebook.featured,
        message: `E-book ${ebook.featured ? 'ajouté aux' : 'retiré des'} e-books en vedette`
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les statistiques des e-books
exports.getEbookStats = async (req, res) => {
  try {
    const [generalStats, categoryStats] = await Promise.all([
      Ebook.getStats(),
      Ebook.getCategoryStats()
    ]);

    const totalPublished = await Ebook.countDocuments({ status: 'published' });
    const totalDrafts = await Ebook.countDocuments({ status: 'draft' });
    const totalRevenue = await Ebook.aggregate([
      { $group: { _id: null, total: { $sum: '$revenue' } } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalPublished,
          totalDrafts,
          totalRevenue: totalRevenue[0]?.total || 0
        },
        generalStats,
        categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Générer une URL de téléchargement sécurisée (après achat)
exports.generateDownloadUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const Order = require('../models/order.model');
    
    const ebook = await Ebook.findById(id);
    if (!ebook) {
      return res.status(404).json({
        status: 'error',
        message: 'E-book non trouvé'
      });
    }

    // Vérifier que l'utilisateur a acheté l'e-book OU que c'est gratuit
    if (ebook.price > 0) {
      const order = await Order.findOne({
        user: req.user._id,
        'items.ebook': id,
        status: 'completed'
      });

      if (!order) {
        return res.status(403).json({
          status: 'error',
          message: 'Vous n\'avez pas accès à ce livre. Veuillez l\'acheter d\'abord.'
        });
      }
    }

    // Incrémenter le compteur de téléchargements
    await ebook.incrementDownloads();

    // Retourner l'URL du fichier (Cloudinary ou local)
    res.status(200).json({
      status: 'success',
      data: {
        downloadUrl: ebook.pdfFile,
        title: ebook.title,
        expiresIn: 24 * 3600
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Proxy pour servir le PDF avec les bons headers CORS
exports.streamPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const Order = require('../models/order.model');
    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');
    
    const ebook = await Ebook.findById(id);
    if (!ebook) {
      return res.status(404).json({
        status: 'error',
        message: 'E-book non trouvé'
      });
    }

    // Vérifier que le fichier PDF existe
    if (!ebook.pdfFile) {
      console.error('❌ Ebook sans fichier PDF:', id);
      return res.status(404).json({
        status: 'error',
        message: 'Fichier PDF non disponible'
      });
    }

    // Vérifier que l'utilisateur a acheté l'e-book OU que c'est gratuit
    if (ebook.price > 0) {
      const order = await Order.findOne({
        user: req.user._id,
        'items.ebook': id,
        status: 'completed'
      });

      if (!order) {
        return res.status(403).json({
          status: 'error',
          message: 'Vous n\'avez pas accès à ce livre'
        });
      }
    }

    // Vérifier si le fichier est sur Cloudinary ou local
    if (ebook.pdfFile.includes('cloudinary.com')) {
      // Fichier sur Cloudinary - streamer depuis Cloudinary
      console.log('📄 Streaming PDF depuis Cloudinary:', ebook.pdfFile);
      
      const response = await axios.get(ebook.pdfFile, {
        responseType: 'arraybuffer',
        headers: {
          'Accept': 'application/pdf',
          'Accept-Encoding': 'identity'
        },
        decompress: false,
        timeout: 30000
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(ebook.title)}.pdf"`);
      res.setHeader('Content-Length', response.data.byteLength);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      res.send(Buffer.from(response.data));
    } else {
      // Fichier local - servir depuis /uploads/
      const filePath = path.join(__dirname, '..', ebook.pdfFile);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          status: 'error',
          message: 'Fichier PDF introuvable'
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(ebook.title)}.pdf"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
  } catch (error) {
    console.error('❌ Erreur streaming PDF:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du chargement du PDF: ' + error.message
    });
  }
};