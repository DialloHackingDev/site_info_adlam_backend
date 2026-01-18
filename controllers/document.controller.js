const Document = require('../models/document.model');
const cloudinary = require('../config/cloudinary');

// Créer un document (Admin seulement)
exports.createDocument = async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      type,
      category,
      language,
      tags,
      status,
      isPublic,
      allowDownload,
      metaTitle,
      metaDescription,
      keywords,
      featured
    } = req.body;

    // Vérifier que le fichier principal est présent
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Fichier principal obligatoire'
      });
    }

    const file = req.files.file;
    
    // Upload du fichier principal
    const fileResult = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: 'adlam/documents',
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true
    });

    const documentData = {
      title,
      description,
      content,
      type,
      category,
      language: language || 'pular',
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      status: status || 'draft',
      isPublic: isPublic !== undefined ? isPublic : true,
      allowDownload: allowDownload !== undefined ? allowDownload : true,
      metaTitle,
      metaDescription,
      keywords: Array.isArray(keywords) ? keywords : (keywords ? keywords.split(',').map(k => k.trim()) : []),
      featured: featured || false,
      createdBy: req.user._id,
      // Fichier principal
      fileUrl: fileResult.secure_url,
      filePublicId: fileResult.public_id,
      fileName: file.name,
      fileSize: fileResult.bytes,
      mimeType: file.mimetype
    };

    // Upload de la miniature si fournie
    if (req.files && req.files.thumbnail) {
      const thumbnailResult = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath, {
        folder: 'adlam/documents/thumbnails',
        resource_type: 'image'
      });
      documentData.thumbnailUrl = thumbnailResult.secure_url;
      documentData.thumbnailPublicId = thumbnailResult.public_id;
    }

    const document = await Document.create(documentData);
    await document.populate('createdBy', 'name email');

    res.status(201).json({
      status: 'success',
      data: { document: document.getPublicData() }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir tous les documents avec filtres
exports.getAllDocuments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      type,
      search,
      sort = 'newest',
      featured,
      language
    } = req.query;

    const skip = (page - 1) * limit;
    
    let query = {};
    let sortOptions = {};

    // Filtres de base
    if (!req.user || req.user.role !== 'admin') {
      query.status = 'published';
      query.isPublic = true;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (language && language !== 'all') {
      query.language = language;
    }

    if (featured !== undefined) {
      query.featured = featured === 'true';
    }

    // Options de tri
    switch (sort) {
      case 'newest':
        sortOptions = { publishedAt: -1 };
        break;
      case 'oldest':
        sortOptions = { publishedAt: 1 };
        break;
      case 'popular':
        sortOptions = { downloads: -1, views: -1 };
        break;
      case 'title':
        sortOptions = { title: 1 };
        break;
      default:
        sortOptions = { publishedAt: -1 };
    }

    let documents;
    let total;

    if (search) {
      // Recherche textuelle
      documents = await Document.searchDocuments(search, {
        category,
        type,
        limit: parseInt(limit),
        skip
      });
      total = await Document.countDocuments({
        ...query,
        $text: { $search: search }
      });
    } else {
      // Requête normale
      documents = await Document.find(query)
        .populate('createdBy', 'name email')
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(skip);
      
      total = await Document.countDocuments(query);
    }

    res.status(200).json({
      status: 'success',
      results: documents.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: { 
        documents: documents.map(doc => doc.getPublicData ? doc.getPublicData() : doc)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir un document par slug
exports.getDocumentBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const document = await Document.findOne({ slug })
      .populate('createdBy', 'name email');

    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document non trouvé'
      });
    }

    // Vérifier les permissions pour les documents non publiés
    if (document.status !== 'published' && 
        (!req.user || (req.user._id.toString() !== document.createdBy._id.toString() && req.user.role !== 'admin'))) {
      return res.status(403).json({
        status: 'error',
        message: 'Accès non autorisé'
      });
    }

    // Vérifier si le document est public
    if (!document.isPublic && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({
        status: 'error',
        message: 'Document privé'
      });
    }

    // Incrémenter les vues (seulement pour les documents publiés)
    if (document.status === 'published') {
      await document.incrementViews();
    }

    res.status(200).json({
      status: 'success',
      data: { document: document.getPublicData() }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les documents récents
exports.getRecentDocuments = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const documents = await Document.getRecent(parseInt(limit));

    res.status(200).json({
      status: 'success',
      results: documents.length,
      data: { documents: documents.map(doc => doc.getPublicData()) }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les documents en vedette
exports.getFeaturedDocuments = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const documents = await Document.getFeatured(parseInt(limit));

    res.status(200).json({
      status: 'success',
      results: documents.length,
      data: { documents: documents.map(doc => doc.getPublicData()) }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les documents par catégorie
exports.getDocumentsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const documents = await Document.getByCategory(category, {
      limit: parseInt(limit),
      skip: (page - 1) * limit
    });

    const total = await Document.countDocuments({
      status: 'published',
      isPublic: true,
      category
    });

    res.status(200).json({
      status: 'success',
      results: documents.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: { documents: documents.map(doc => doc.getPublicData()) }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les documents par type
exports.getDocumentsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const documents = await Document.getByType(type, {
      limit: parseInt(limit),
      skip: (page - 1) * limit
    });

    const total = await Document.countDocuments({
      status: 'published',
      isPublic: true,
      type
    });

    res.status(200).json({
      status: 'success',
      results: documents.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: { documents: documents.map(doc => doc.getPublicData()) }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Mettre à jour un document (Admin seulement)
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document non trouvé'
      });
    }

    // Traiter les nouveaux fichiers si fournis
    if (req.files) {
      if (req.files.file) {
        // Supprimer l'ancien fichier
        if (document.filePublicId) {
          await cloudinary.uploader.destroy(document.filePublicId, { resource_type: 'auto' });
        }

        // Upload du nouveau fichier
        const fileResult = await cloudinary.uploader.upload(req.files.file.tempFilePath, {
          folder: 'adlam/documents',
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true
        });

        updates.fileUrl = fileResult.secure_url;
        updates.filePublicId = fileResult.public_id;
        updates.fileName = req.files.file.name;
        updates.fileSize = fileResult.bytes;
        updates.mimeType = req.files.file.mimetype;
      }

      if (req.files.thumbnail) {
        // Supprimer l'ancienne miniature
        if (document.thumbnailPublicId) {
          await cloudinary.uploader.destroy(document.thumbnailPublicId);
        }

        // Upload de la nouvelle miniature
        const thumbnailResult = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath, {
          folder: 'adlam/documents/thumbnails',
          resource_type: 'image'
        });

        updates.thumbnailUrl = thumbnailResult.secure_url;
        updates.thumbnailPublicId = thumbnailResult.public_id;
      }
    }

    // Traiter les tags et keywords
    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map(t => t.trim());
    }
    if (updates.keywords && typeof updates.keywords === 'string') {
      updates.keywords = updates.keywords.split(',').map(k => k.trim());
    }

    const updatedDocument = await Document.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.status(200).json({
      status: 'success',
      data: { document: updatedDocument.getPublicData() }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Supprimer un document (Admin seulement)
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document non trouvé'
      });
    }

    // Supprimer les fichiers de Cloudinary
    if (document.filePublicId) {
      await cloudinary.uploader.destroy(document.filePublicId, { resource_type: 'auto' });
    }
    if (document.thumbnailPublicId) {
      await cloudinary.uploader.destroy(document.thumbnailPublicId);
    }

    await Document.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Document supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Basculer le statut featured (Admin seulement)
exports.toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document non trouvé'
      });
    }

    await document.toggleFeatured();

    res.status(200).json({
      status: 'success',
      data: {
        featured: document.featured,
        message: `Document ${document.featured ? 'ajouté aux' : 'retiré des'} documents en vedette`
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Télécharger un document
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document non trouvé'
      });
    }

    // Vérifier les permissions
    if (document.status !== 'published' || !document.isPublic || !document.allowDownload) {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Téléchargement non autorisé'
        });
      }
    }

    // Incrémenter le compteur de téléchargements
    await document.incrementDownloads();

    // Rediriger vers l'URL du fichier
    res.redirect(document.fileUrl);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtenir les statistiques des documents (Admin seulement)
exports.getDocumentStats = async (req, res) => {
  try {
    const [generalStats, categoryStats, typeStats] = await Promise.all([
      Document.getStats(),
      Document.getCategoryStats(),
      Document.getTypeStats()
    ]);

    const totalPublished = await Document.countDocuments({ status: 'published' });
    const totalDrafts = await Document.countDocuments({ status: 'draft' });

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalPublished,
          totalDrafts
        },
        generalStats,
        categoryStats,
        typeStats
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};