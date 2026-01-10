const Article = require('../models/article.model');

/**
 * Service de gestion des slugs
 */
class SlugService {
  /**
   * Génère un slug à partir d'un titre
   */
  static generateSlug(title) {
    return title
      .toLowerCase()
      .trim()
      // Remplacer les caractères spéciaux par des tirets
      .replace(/[^a-z0-9\s-]/g, '')
      // Remplacer les espaces multiples par un seul tiret
      .replace(/\s+/g, '-')
      // Remplacer les tirets multiples par un seul
      .replace(/-+/g, '-')
      // Supprimer les tirets en début et fin
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Génère un slug unique en vérifiant la base de données
   */
  static async generateUniqueSlug(title, excludeId = null) {
    let baseSlug = this.generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    while (await this.slugExists(slug, excludeId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Vérifie si un slug existe déjà
   */
  static async slugExists(slug, excludeId = null) {
    const query = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingArticle = await Article.findOne(query);
    return !!existingArticle;
  }

  /**
   * Met à jour le slug d'un article existant
   */
  static async updateSlug(articleId, newTitle) {
    try {
      const newSlug = await this.generateUniqueSlug(newTitle, articleId);
      
      const article = await Article.findByIdAndUpdate(
        articleId,
        { slug: newSlug },
        { new: true }
      );

      return article;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du slug:', error);
      throw error;
    }
  }

  /**
   * Valide un slug personnalisé
   */
  static validateSlug(slug) {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug);
  }

  /**
   * Nettoie et valide un slug personnalisé
   */
  static async processCustomSlug(customSlug, excludeId = null) {
    // Nettoyer le slug
    const cleanSlug = this.generateSlug(customSlug);
    
    // Valider le format
    if (!this.validateSlug(cleanSlug)) {
      throw new Error('Format de slug invalide');
    }

    // Vérifier l'unicité
    if (await this.slugExists(cleanSlug, excludeId)) {
      throw new Error('Ce slug est déjà utilisé');
    }

    return cleanSlug;
  }
}

module.exports = SlugService;