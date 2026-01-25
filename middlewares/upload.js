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