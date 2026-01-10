const { uploadArticleImage } = require('../config/cloudinary');

/**
 * Middleware pour l'upload d'image de couverture d'article
 */
exports.uploadCoverImage = (req, res, next) => {
  const upload = uploadArticleImage.single('coverImage');
  
  upload(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: 'error',
          message: 'Fichier trop volumineux. Taille maximum: 5MB'
        });
      }
      
      if (error.message === 'Seules les images sont autorisées') {
        return res.status(400).json({
          status: 'error',
          message: 'Format de fichier non supporté. Utilisez JPG, PNG ou WebP'
        });
      }
      
      return res.status(400).json({
        status: 'error',
        message: 'Erreur lors de l\'upload: ' + error.message
      });
    }
    
    // Ajouter l'URL de l'image uploadée au body si présente
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
  const upload = uploadArticleImage.single('coverImage');
  
  upload(req, res, (error) => {
    if (error) {
      // Pour un upload optionnel, on continue même en cas d'erreur
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
 * Middleware pour valider les dimensions d'image
 */
exports.validateImageDimensions = (minWidth = 800, minHeight = 400) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }

    // Cloudinary fournit les dimensions dans req.file
    const { width, height } = req.file;
    
    if (width < minWidth || height < minHeight) {
      return res.status(400).json({
        status: 'error',
        message: `Image trop petite. Dimensions minimum: ${minWidth}x${minHeight}px`
      });
    }
    
    next();
  };
};