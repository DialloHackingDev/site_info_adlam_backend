const cron = require('node-cron');
const Article = require('../models/article.model');

/**
 * Service de gestion des articles planifiés
 */
class SchedulerService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Démarre le scheduler pour publier les articles planifiés
   */
  start() {
    if (this.isRunning) return;

    // Vérifier toutes les 5 minutes (au lieu de chaque minute)
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      await this.publishScheduledArticles();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.isRunning = true;
    console.log('📅 Scheduler des articles planifiés démarré (toutes les 5 min)');
  }

  /**
   * Arrête le scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('📅 Scheduler des articles planifiés arrêté');
    }
  }

  /**
   * Publie les articles dont la date de planification est atteinte
   */
  async publishScheduledArticles() {
    try {
      // Vérifier si la base de données est connectée
      if (require('mongoose').connection.readyState !== 1) {
        console.log('⚠️ Base de données non connectée, skip scheduler');
        return;
      }

      const now = new Date();
      
      const articlesToPublish = await Article.find({
        status: 'scheduled',
        scheduledAt: { $lte: now }
      });

      if (articlesToPublish.length > 0) {
        console.log(`📰 Publication de ${articlesToPublish.length} article(s) planifié(s)`);
        
        for (const article of articlesToPublish) {
          await Article.findByIdAndUpdate(article._id, {
            status: 'published',
            publishedAt: now,
            scheduledAt: null
          });
          
          console.log(`✅ Article "${article.title}" publié automatiquement`);
        }
      }
    } catch (error) {
      // Ne pas afficher l'erreur complète si c'est un problème de connexion
      if (error.name === 'MongoServerSelectionError') {
        console.log('⚠️ Connexion MongoDB temporairement indisponible');
      } else {
        console.error('❌ Erreur lors de la publication des articles planifiés:', error.message);
      }
    }
  }

  /**
   * Planifie un article pour une date donnée
   */
  async scheduleArticle(articleId, scheduledDate) {
    try {
      const article = await Article.findByIdAndUpdate(
        articleId,
        {
          status: 'scheduled',
          scheduledAt: new Date(scheduledDate),
          publishedAt: null
        },
        { new: true }
      );

      console.log(`📅 Article "${article.title}" planifié pour le ${scheduledDate}`);
      return article;
    } catch (error) {
      console.error('❌ Erreur lors de la planification:', error);
      throw error;
    }
  }

  /**
   * Annule la planification d'un article
   */
  async unscheduleArticle(articleId) {
    try {
      const article = await Article.findByIdAndUpdate(
        articleId,
        {
          status: 'draft',
          scheduledAt: null
        },
        { new: true }
      );

      console.log(`📅 Planification annulée pour "${article.title}"`);
      return article;
    } catch (error) {
      console.error('❌ Erreur lors de l\'annulation de planification:', error);
      throw error;
    }
  }

  /**
   * Obtient les statistiques des articles planifiés
   */
  async getScheduledStats() {
    try {
      const scheduledCount = await Article.countDocuments({ status: 'scheduled' });
      const nextScheduled = await Article.findOne(
        { status: 'scheduled' },
        null,
        { sort: { scheduledAt: 1 } }
      );

      return {
        totalScheduled: scheduledCount,
        nextPublication: nextScheduled ? {
          title: nextScheduled.title,
          scheduledAt: nextScheduled.scheduledAt
        } : null
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des stats:', error);
      throw error;
    }
  }
}

// Instance singleton
const schedulerService = new SchedulerService();

module.exports = schedulerService;