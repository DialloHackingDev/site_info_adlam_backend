const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { cloudinary } = require('../config/cloudinary');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
// Seuls les fichiers créés par ce service peuvent être supprimés localement
const LOCAL_FILE_PATTERN = /^(cover|pdf)-\d+-[0-9a-f]{8}\.[a-z0-9]+$/;

const isCloudinaryConfigured = () => Boolean(
  process.env.CLOUDINARY_CLOUDNAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// Le disque de l'hébergeur (Render) est effacé à chaque déploiement :
// le stockage local ne sert qu'au développement
const canUseLocalStorage = () => process.env.NODE_ENV !== 'production';

class StorageNotConfiguredError extends Error {
  constructor() {
    super('Stockage des fichiers non configuré : renseignez CLOUDINARY_CLOUDNAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET');
    this.statusCode = 503;
  }
}

const uploadToCloudinary = (buffer, options) => new Promise((resolve, reject) => {
  cloudinary.uploader.upload_stream(options, (error, result) => {
    if (error) reject(error);
    else resolve(result);
  }).end(buffer);
});

const saveLocally = async (buffer, prefix, originalName) => {
  const ext = path.extname(originalName || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
  const name = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, name), buffer);
  return { url: `/uploads/${name}`, publicId: null };
};

/**
 * Enregistre une image (couverture d'article ou d'e-book).
 * Renvoie { url, publicId } — publicId est null pour un fichier local.
 */
exports.uploadImage = async (file, folder) => {
  if (isCloudinaryConfigured()) {
    const result = await uploadToCloudinary(file.buffer, { folder, resource_type: 'image' });
    return { url: result.secure_url, publicId: result.public_id };
  }
  if (canUseLocalStorage()) return saveLocally(file.buffer, 'cover', file.originalname);
  throw new StorageNotConfiguredError();
};

/**
 * Enregistre le PDF d'un e-book, jamais accessible publiquement :
 * 'authenticated' sur Cloudinary, et /uploads/*.pdf n'est pas servi en local.
 */
exports.uploadPdf = async (file) => {
  if (isCloudinaryConfigured()) {
    const result = await uploadToCloudinary(file.buffer, {
      folder: 'adlam/ebooks/pdfs',
      resource_type: 'raw',
      type: 'authenticated'
    });
    return { url: result.secure_url, publicId: result.public_id };
  }
  if (canUseLocalStorage()) return saveLocally(file.buffer, 'pdf', file.originalname || 'livre.pdf');
  throw new StorageNotConfiguredError();
};

/**
 * Supprime un fichier, sur Cloudinary ou en local. Les erreurs sont journalisées
 * sans bloquer l'opération principale.
 */
exports.removeFile = async ({ url, publicId, resourceType = 'image', deliveryType }) => {
  try {
    if (publicId && publicId !== 'placeholder' && isCloudinaryConfigured()) {
      const options = { resource_type: resourceType };
      if (deliveryType) options.type = deliveryType;
      await cloudinary.uploader.destroy(publicId, options);
    } else if (url && url.startsWith('/uploads/') && LOCAL_FILE_PATTERN.test(path.basename(url))) {
      await fs.unlink(path.join(UPLOADS_DIR, path.basename(url)));
    }
  } catch (error) {
    console.warn('Suppression de fichier impossible:', error.message);
  }
};

exports.StorageNotConfiguredError = StorageNotConfiguredError;
