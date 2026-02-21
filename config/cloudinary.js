const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

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

// Fonction pour sanitiser les noms de fichiers
const sanitizeFilename = (filename) => {
  return filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
};

// Stockage local pour les articles (sans caractères spéciaux)
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = file.fieldname === 'pdfFile' ? 'pdf-' : 
                   file.fieldname === 'coverImage' && req.baseUrl.includes('ebook') ? 'cover-' : 'article-';
    // Ne garder que le timestamp et l'extension, sans le nom original
    cb(null, `${prefix}${Date.now()}${ext}`);
  }
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

// Middleware multer pour l'upload d'images d'articles (stockage local)
const uploadArticleImage = multer({
  storage: localStorage,
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

// Middleware pour upload multiple (couverture + PDF) - stockage local
const uploadEbookFiles = multer({
  storage: localStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
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