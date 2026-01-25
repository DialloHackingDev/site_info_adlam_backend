const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUDNAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('Cloudinary configuré:', {
  cloud_name: process.env.CLOUDINARY_CLOUDNAME,
  api_key: process.env.CLOUDINARY_API_KEY ? 'Défini' : 'Non défini',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'Défini' : 'Non défini'
});

// Configuration du stockage Cloudinary pour les images d'articles
const articleImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'adlam/articles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, height: 600, crop: 'fill', quality: 'auto' },
      { format: 'webp' }
    ]
  }
});

// Configuration du stockage pour les couvertures d'e-books
const ebookCoverStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'adlam/ebooks/covers',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 600, crop: 'fill', quality: 'auto' },
      { format: 'webp' }
    ]
  }
});

// Configuration du stockage pour les fichiers PDF d'e-books
const ebookPdfStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'adlam/ebooks/pdfs',
    allowed_formats: ['pdf'],
    resource_type: 'raw' // Important pour les PDFs
  }
});

// Middleware multer pour l'upload d'images d'articles
const uploadArticleImage = multer({
  storage: articleImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'), false);
    }
  }
});

// Middleware multer pour l'upload de couvertures d'e-books
const uploadEbookCover = multer({
  storage: ebookCoverStorage,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3MB max pour les couvertures
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées pour la couverture'), false);
    }
  }
});

// Middleware multer pour l'upload de PDFs d'e-books
const uploadEbookPdf = multer({
  storage: ebookPdfStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max pour les PDFs
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont autorisés'), false);
    }
  }
});

// Middleware pour upload multiple (couverture + PDF)
const uploadEbookFiles = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Réduction à 10MB pour éviter DoS
    files: 2
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'coverImage' && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else if (file.fieldname === 'pdfFile' && file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error(`Format non supporté pour ${file.fieldname}`), false);
    }
  }
});

// Fonction pour supprimer une image de Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Erreur suppression image Cloudinary:', error);
    throw error;
  }
};

// Fonction pour extraire le public_id d'une URL Cloudinary
const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  
  const parts = url.split('/');
  const uploadIndex = parts.findIndex(part => part === 'upload');
  if (uploadIndex === -1) return null;
  
  // Récupérer la partie après /upload/v{version}/
  const pathAfterUpload = parts.slice(uploadIndex + 2).join('/');
  // Supprimer l'extension
  return pathAfterUpload.replace(/\.[^/.]+$/, '');
};

module.exports = {
  cloudinary,
  uploadArticleImage,
  uploadEbookCover,
  uploadEbookPdf,
  uploadEbookFiles,
  deleteImage,
  extractPublicId
};