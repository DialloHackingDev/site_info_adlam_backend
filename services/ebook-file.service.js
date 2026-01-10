const { cloudinary } = require('../config/cloudinary');

/**
 * Service de gestion des fichiers e-books
 */
class EbookFileService {
  /**
   * Upload d'un fichier vers Cloudinary depuis un buffer
   */
  static async uploadFromBuffer(buffer, options = {}) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(buffer);
    });
  }

  /**
   * Upload de la couverture d'un e-book
   */
  static async uploadCover(buffer, filename) {
    try {
      const result = await this.uploadFromBuffer(buffer, {
        folder: 'adlam/ebooks/covers',
        public_id: `cover_${Date.now()}_${filename.replace(/\.[^/.]+$/, '')}`,
        transformation: [
          { width: 400, height: 600, crop: 'fill', quality: 'auto' },
          { format: 'webp' }
        ]
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      };
    } catch (error) {
      throw new Error(`Erreur upload couverture: ${error.message}`);
    }
  }

  /**
   * Upload du fichier PDF d'un e-book
   */
  static async uploadPdf(buffer, filename) {
    try {
      const result = await this.uploadFromBuffer(buffer, {
        folder: 'adlam/ebooks/pdfs',
        public_id: `pdf_${Date.now()}_${filename.replace(/\.[^/.]+$/, '')}`,
        resource_type: 'raw',
        format: 'pdf'
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
        pages: result.pages || 0
      };
    } catch (error) {
      throw new Error(`Erreur upload PDF: ${error.message}`);
    }
  }

  /**
   * Génère une URL de preview pour un PDF
   */
  static generatePreviewUrl(publicId, pages = 10) {
    try {
      // Cloudinary peut générer des images de preview des pages PDF
      return cloudinary.url(publicId, {
        resource_type: 'image',
        page: `1-${pages}`,
        format: 'jpg',
        transformation: [
          { width: 300, height: 400, crop: 'fit', quality: 'auto' }
        ]
      });
    } catch (error) {
      console.error('Erreur génération preview:', error);
      return null;
    }
  }

  /**
   * Supprime un fichier de Cloudinary
   */
  static async deleteFile(publicId, resourceType = 'image') {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });
      return result;
    } catch (error) {
      console.error(`Erreur suppression fichier ${publicId}:`, error);
      throw error;
    }
  }

  /**
   * Traite les fichiers uploadés pour un e-book
   */
  static async processEbookFiles(files) {
    const results = {
      cover: null,
      pdf: null,
      errors: []
    };

    try {
      // Traiter la couverture
      if (files.cover && files.cover[0]) {
        const coverFile = files.cover[0];
        results.cover = await this.uploadCover(
          coverFile.buffer, 
          coverFile.originalname
        );
      }

      // Traiter le PDF
      if (files.pdfFile && files.pdfFile[0]) {
        const pdfFile = files.pdfFile[0];
        results.pdf = await this.uploadPdf(
          pdfFile.buffer, 
          pdfFile.originalname
        );

        // Générer l'URL de preview
        if (results.pdf.publicId) {
          results.pdf.previewUrl = this.generatePreviewUrl(
            results.pdf.publicId, 
            10
          );
        }
      }

      return results;
    } catch (error) {
      // Nettoyer les fichiers uploadés en cas d'erreur
      if (results.cover?.publicId) {
        await this.deleteFile(results.cover.publicId).catch(console.error);
      }
      if (results.pdf?.publicId) {
        await this.deleteFile(results.pdf.publicId, 'raw').catch(console.error);
      }
      
      throw error;
    }
  }

  /**
   * Met à jour les fichiers d'un e-book existant
   */
  static async updateEbookFiles(files, existingEbook) {
    const results = {
      cover: null,
      pdf: null,
      oldFiles: {
        cover: existingEbook.coverImagePublicId,
        pdf: existingEbook.pdfFilePublicId
      }
    };

    try {
      // Mettre à jour la couverture si fournie
      if (files.cover && files.cover[0]) {
        const coverFile = files.cover[0];
        results.cover = await this.uploadCover(
          coverFile.buffer, 
          coverFile.originalname
        );
      }

      // Mettre à jour le PDF si fourni
      if (files.pdfFile && files.pdfFile[0]) {
        const pdfFile = files.pdfFile[0];
        results.pdf = await this.uploadPdf(
          pdfFile.buffer, 
          pdfFile.originalname
        );

        if (results.pdf.publicId) {
          results.pdf.previewUrl = this.generatePreviewUrl(
            results.pdf.publicId, 
            existingEbook.previewPages || 10
          );
        }
      }

      // Supprimer les anciens fichiers seulement après succès des nouveaux uploads
      if (results.cover && results.oldFiles.cover) {
        await this.deleteFile(results.oldFiles.cover).catch(console.error);
      }
      if (results.pdf && results.oldFiles.pdf) {
        await this.deleteFile(results.oldFiles.pdf, 'raw').catch(console.error);
      }

      return results;
    } catch (error) {
      // Nettoyer les nouveaux fichiers en cas d'erreur
      if (results.cover?.publicId) {
        await this.deleteFile(results.cover.publicId).catch(console.error);
      }
      if (results.pdf?.publicId) {
        await this.deleteFile(results.pdf.publicId, 'raw').catch(console.error);
      }
      
      throw error;
    }
  }

  /**
   * Valide les fichiers avant upload
   */
  static validateFiles(files) {
    const errors = [];

    // Vérifier la couverture
    if (files.cover && files.cover[0]) {
      const cover = files.cover[0];
      if (!cover.mimetype.startsWith('image/')) {
        errors.push('La couverture doit être une image');
      }
      if (cover.size > 3 * 1024 * 1024) { // 3MB
        errors.push('La couverture ne peut pas dépasser 3MB');
      }
    }

    // Vérifier le PDF
    if (files.pdfFile && files.pdfFile[0]) {
      const pdf = files.pdfFile[0];
      if (pdf.mimetype !== 'application/pdf') {
        errors.push('Le fichier doit être un PDF');
      }
      if (pdf.size > 10 * 1024 * 1024) { // 10MB au lieu de 50MB
        errors.push('Le PDF ne peut pas dépasser 10MB');
      }
    }

    return errors;
  }

  /**
   * Génère une URL de téléchargement sécurisée
   */
  static generateSecureDownloadUrl(publicId, expiresIn = 3600) {
    try {
      return cloudinary.utils.private_download_url(publicId, 'raw', {
        expires_at: Math.floor(Date.now() / 1000) + expiresIn
      });
    } catch (error) {
      console.error('Erreur génération URL sécurisée:', error);
      return null;
    }
  }
}

module.exports = EbookFileService;