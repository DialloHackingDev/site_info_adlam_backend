const { uploadArticleImage } = require('../config/cloudinary');

const { uploadEbookFiles } = require('../config/cloudinary');
const EbookFileService = require('../services/ebook-file.service');

/**
 * Middleware pour l'upload de fichiers e-book (couverture + PDF)
 */
exports.uploadEbookFiles = (req, res, next) => {
  const upload = uploadEbookFiles.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'pdfFile', maxCount: 1 }
  ]);
  
  upload(req, res, async (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: 'error',
          message: 'Fichier trop volumineux. PDF max: 10MB, Image max: 3MB'
        });
      }
      
      return res.status(400).json({
        status: 'error',
        message: 'Erreur lors de l\'upload: ' + error.message
      });
    }
    
    // Valider les fichiers
    if (req.files) {
      const validationErrors = EbookFileService.validateFiles(req.files);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: validationErrors.join(', ')
        });
      }
    }
    
    next();
  });
};

/**
 * Middleware pour l'upload optionnel de fichiers e-book (mise à jour)
 */
exports.uploadOptionalEbookFiles = (req, res, next) => {
  const upload = uploadEbookFiles.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'pdfFile', maxCount: 1 }
  ]);
  
  upload(req, res, async (error) => {
    if (error) {
      console.warn('Erreur upload optionnel:', error.message);
    }
    
    // Valider les fichiers si présents
    if (req.files) {
      const validationErrors = EbookFileService.validateFiles(req.files);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: validationErrors.join(', ')
        });
      }
    }
    
    next();
  });
};

/**
 * Middleware pour l'upload d'image de couverture d'article
 */
exports.uploadCoverImage = (req, res, next) => {
  const { uploadArticleImage } = require('../config/cloudinary');
  const upload = uploadArticleImage.single('coverImage');
  
  upload(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: 'error',
          message: 'Fichier trop volumineux. Taille maximum: 5MB'
        });
      }
      
      return res.status(400).json({
        status: 'error',
        message: 'Erreur lors de l\'upload: ' + error.message
      });
    }
    
    if (req.file) {
      req.body.coverImage = req.file.path;
      req.uploadedImagePublicId = req.file.filename;
    }
    
    next();
  });
};

/**
 * Middleware pour l'upload optionnel d'image
 */
exports.uploadOptionalImage = (req, res, next) => {
  const { uploadArticleImage } = require('../config/cloudinary');
  const upload = uploadArticleImage.single('coverImage');
  
  upload(req, res, (error) => {
    if (error) {
      console.warn('Erreur upload optionnel:', error.message);
    }
    
    if (req.file) {
      req.body.coverImage = req.file.path;
      req.uploadedImagePublicId = req.file.filename;
    }
    
    next();
  });
};

/**
 * Middleware pour l'upload de fichiers documents (fichier + miniature optionnelle)
 */
exports.uploadDocumentFiles = (req, res, next) => {
  const { uploadDocumentFile, uploadDocumentThumbnail } = require('../config/cloudinary');
  const upload = require('multer')().fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]);
  
  // Utiliser multer avec CloudinaryStorage
  const uploadFile = uploadDocumentFile.single('file');
  const uploadThumb = uploadDocumentThumbnail.single('thumbnail');
  
  // Upload fichier principal
  uploadFile(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: 'error',
          message: 'Fichier trop volumineux. Taille maximum: 20MB'
        });
      }
      return res.status(400).json({
        status: 'error',
        message: 'Erreur lors de l\'upload du fichier: ' + error.message
      });
    }
    
    if (req.file) {
      req.uploadedFile = {
        url: req.file.path,
        publicId: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname
      };
    }
    
    // Upload miniature (optionnel)
    uploadThumb(req, res, (thumbError) => {
      if (thumbError) {
        console.warn('Erreur upload miniature:', thumbError.message);
      }
      
      if (req.file && req.file.fieldname === 'thumbnail') {
        req.uploadedThumbnail = {
          url: req.file.path,
          publicId: req.file.filename
        };
      }
      
      next();
    });
  });
};

/**
 * Middleware pour l'upload optionnel de fichiers documents (mise à jour)
 */
exports.uploadOptionalDocumentFiles = (req, res, next) => {
  const { uploadDocumentFile, uploadDocumentThumbnail } = require('../config/cloudinary');
  
  const uploadFile = uploadDocumentFile.single('file');
  const uploadThumb = uploadDocumentThumbnail.single('thumbnail');
  
  uploadFile(req, res, (error) => {
    if (error) {
      console.warn('Erreur upload fichier optionnel:', error.message);
    }
    
    if (req.file) {
      req.uploadedFile = {
        url: req.file.path,
        publicId: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname
      };
    }
    
    uploadThumb(req, res, (thumbError) => {
      if (thumbError) {
        console.warn('Erreur upload miniature optionnelle:', thumbError.message);
      }
      
      if (req.file && req.file.fieldname === 'thumbnail') {
        req.uploadedThumbnail = {
          url: req.file.path,
          publicId: req.file.filename
        };
      }
      
      next();
    });
  });
};