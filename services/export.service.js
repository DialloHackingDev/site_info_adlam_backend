const { Parser } = require('json2csv');

class ExportService {
  /**
   * Exporte des données en CSV
   * @param {Array} data - Données à exporter
   * @param {Array} fields - Champs à inclure
   * @returns {string} - Contenu CSV
   */
  exportToCSV(data, fields) {
    try {
      const parser = new Parser({ fields });
      return parser.parse(data);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  /**
   * Exporte les articles en CSV
   * @param {Array} articles - Liste des articles
   * @returns {string} - Contenu CSV
   */
  exportArticles(articles) {
    const fields = [
      { label: 'ID', value: '_id' },
      { label: 'Titre', value: 'title' },
      { label: 'Catégorie', value: 'category' },
      { label: 'Statut', value: 'status' },
      { label: 'Vues', value: 'views' },
      { label: 'Likes', value: 'likes' },
      { label: 'Temps de lecture (min)', value: 'readingTime' },
      { label: 'Auteur', value: 'author.name' },
      { label: 'Date de publication', value: 'publishedAt' },
      { label: 'Date de création', value: 'createdAt' }
    ];

    return this.exportToCSV(articles, fields);
  }

  /**
   * Exporte les utilisateurs en CSV
   * @param {Array} users - Liste des utilisateurs
   * @returns {string} - Contenu CSV
   */
  exportUsers(users) {
    const fields = [
      { label: 'ID', value: '_id' },
      { label: 'Nom', value: 'name' },
      { label: 'Email', value: 'email' },
      { label: 'Rôle', value: 'role' },
      { label: 'Date d\'inscription', value: 'createdAt' }
    ];

    return this.exportToCSV(users, fields);
  }

  /**
   * Exporte les ebooks en CSV
   * @param {Array} ebooks - Liste des ebooks
   * @returns {string} - Contenu CSV
   */
  exportEbooks(ebooks) {
    const fields = [
      { label: 'ID', value: '_id' },
      { label: 'Titre', value: 'title' },
      { label: 'Auteur', value: 'author' },
      { label: 'Catégorie', value: 'category' },
      { label: 'Prix (GNF)', value: 'price' },
      { label: 'Ventes', value: 'sales' },
      { label: 'Téléchargements', value: 'downloads' },
      { label: 'Revenus (GNF)', value: 'revenue' },
      { label: 'Statut', value: 'status' },
      { label: 'Date de publication', value: 'publishedAt' }
    ];

    return this.exportToCSV(ebooks, fields);
  }

  /**
   * Exporte les commandes en CSV
   * @param {Array} orders - Liste des commandes
   * @returns {string} - Contenu CSV
   */
  exportOrders(orders) {
    const fields = [
      { label: 'ID', value: '_id' },
      { label: 'Utilisateur', value: 'user.name' },
      { label: 'Email', value: 'user.email' },
      { label: 'Montant total (GNF)', value: 'totalAmount' },
      { label: 'Statut', value: 'status' },
      { label: 'Méthode de paiement', value: 'paymentMethod' },
      { label: 'Date', value: 'createdAt' }
    ];

    return this.exportToCSV(orders, fields);
  }

  /**
   * Exporte les commentaires en CSV
   * @param {Array} comments - Liste des commentaires
   * @returns {string} - Contenu CSV
   */
  exportComments(comments) {
    const fields = [
      { label: 'ID', value: '_id' },
      { label: 'Contenu', value: 'content' },
      { label: 'Auteur', value: 'author.name' },
      { label: 'Article', value: 'article.title' },
      { label: 'Likes', value: 'likes' },
      { label: 'Statut', value: 'status' },
      { label: 'Date', value: 'createdAt' }
    ];

    return this.exportToCSV(comments, fields);
  }
}

module.exports = new ExportService();
