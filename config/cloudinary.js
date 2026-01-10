const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
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
  deleteImage,
  extractPublicId
};