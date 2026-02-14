const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class ImageOptimizerService {
  constructor() {
    this.sizes = {
      thumbnail: { width: 400, height: 250 },
      medium: { width: 800, height: 500 },
      large: { width: 1920, height: 1080 }
    };
    this.quality = 80;
  }

  /**
   * Optimise une image et génère plusieurs tailles en WebP
   * @param {string} inputPath - Chemin du fichier original
   * @param {string} outputDir - Dossier de sortie
   * @param {string} filename - Nom du fichier sans extension
   * @returns {Promise<Object>} - Chemins des fichiers générés
   */
  async optimizeImage(inputPath, outputDir, filename) {
    try {
      const results = {
        original: inputPath,
        webp: {}
      };

      // Créer le dossier de sortie s'il n'existe pas
      await fs.mkdir(outputDir, { recursive: true });

      // Lire l'image originale
      const image = sharp(inputPath);
      const metadata = await image.metadata();

      // Générer les différentes tailles en WebP
      for (const [sizeName, dimensions] of Object.entries(this.sizes)) {
        const outputPath = path.join(outputDir, `${filename}-${sizeName}.webp`);
        
        await image
          .clone()
          .resize(dimensions.width, dimensions.height, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: this.quality })
          .toFile(outputPath);

        results.webp[sizeName] = outputPath.replace(/\\/g, '/');
      }

      // Générer aussi une version WebP de l'original (sans resize)
      const originalWebpPath = path.join(outputDir, `${filename}-original.webp`);
      await image
        .clone()
        .webp({ quality: this.quality })
        .toFile(originalWebpPath);

      results.webp.original = originalWebpPath.replace(/\\/g, '/');

      return results;
    } catch (error) {
      console.error('Erreur lors de l\'optimisation de l\'image:', error);
      throw error;
    }
  }

  /**
   * Optimise une image uploadée via Multer
   * @param {Object} file - Fichier Multer
   * @returns {Promise<Object>} - Chemins des fichiers générés
   */
  async optimizeUploadedImage(file) {
    const filename = path.parse(file.filename).name;
    const outputDir = path.dirname(file.path);
    
    return await this.optimizeImage(file.path, outputDir, filename);
  }

  /**
   * Supprime les fichiers optimisés
   * @param {Object} paths - Objet contenant les chemins des fichiers
   */
  async deleteOptimizedImages(paths) {
    try {
      if (paths.webp) {
        for (const filePath of Object.values(paths.webp)) {
          try {
            await fs.unlink(filePath);
          } catch (error) {
            console.error(`Erreur lors de la suppression de ${filePath}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la suppression des images optimisées:', error);
    }
  }

  /**
   * Obtient l'URL publique d'une image optimisée
   * @param {string} filePath - Chemin du fichier
   * @param {string} size - Taille souhaitée (thumbnail, medium, large, original)
   * @returns {string} - URL publique
   */
  getPublicUrl(filePath, size = 'medium') {
    if (!filePath) return null;
    
    // Si c'est déjà une URL complète, la retourner
    if (filePath.startsWith('http')) return filePath;
    
    // Construire l'URL publique
    const filename = path.parse(filePath).name;
    return `/uploads/${filename}-${size}.webp`;
  }
}

module.exports = new ImageOptimizerService();
