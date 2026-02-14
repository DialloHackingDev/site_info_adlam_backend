const Article = require('../models/article.model');
const Ebook = require('../models/ebook.model');
const User = require('../models/users.model');
const Order = require('../models/order.model');

class AnalyticsService {
  /**
   * Obtient les statistiques globales
   */
  async getGlobalStats() {
    const [articles, ebooks, users, orders] = await Promise.all([
      Article.countDocuments({ status: 'published' }),
      Ebook.countDocuments({ status: 'published' }),
      User.countDocuments(),
      Order.countDocuments({ status: 'completed' })
    ]);

    const totalRevenue = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    return {
      articles,
      ebooks,
      users,
      orders,
      revenue: totalRevenue[0]?.total || 0
    };
  }

  /**
   * Obtient les statistiques de trafic par période
   */
  async getTrafficStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const articleViews = await Article.aggregate([
      {
        $match: {
          lastViewedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$lastViewedAt' }
          },
          views: { $sum: '$views' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return articleViews;
  }

  /**
   * Obtient les articles les plus populaires
   */
  async getTopArticles(limit = 10) {
    return await Article.find({ status: 'published' })
      .sort({ views: -1, likes: -1 })
      .limit(limit)
      .select('title views likes category publishedAt')
      .populate('author', 'name');
  }

  /**
   * Obtient les ebooks les plus vendus
   */
  async getTopEbooks(limit = 10) {
    return await Ebook.find({ status: 'published' })
      .sort({ sales: -1 })
      .limit(limit)
      .select('title author sales revenue price');
  }

  /**
   * Obtient les statistiques par catégorie
   */
  async getCategoryStats() {
    const articleStats = await Article.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          avgReadingTime: { $avg: '$readingTime' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const ebookStats = await Ebook.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSales: { $sum: '$sales' },
          totalRevenue: { $sum: '$revenue' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    return { articles: articleStats, ebooks: ebookStats };
  }

  /**
   * Obtient les revenus par mois
   */
  async getMonthlyRevenue(months = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const revenue = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return revenue;
  }

  /**
   * Obtient les statistiques de croissance
   */
  async getGrowthStats() {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [lastMonthUsers, thisMonthUsers] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: lastMonth, $lt: thisMonth } }),
      User.countDocuments({ createdAt: { $gte: thisMonth } })
    ]);

    const [lastMonthArticles, thisMonthArticles] = await Promise.all([
      Article.countDocuments({ publishedAt: { $gte: lastMonth, $lt: thisMonth } }),
      Article.countDocuments({ publishedAt: { $gte: thisMonth } })
    ]);

    const [lastMonthRevenue, thisMonthRevenue] = await Promise.all([
      Order.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: lastMonth, $lt: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      users: {
        current: thisMonthUsers,
        previous: lastMonthUsers,
        growth: calculateGrowth(thisMonthUsers, lastMonthUsers)
      },
      articles: {
        current: thisMonthArticles,
        previous: lastMonthArticles,
        growth: calculateGrowth(thisMonthArticles, lastMonthArticles)
      },
      revenue: {
        current: thisMonthRevenue[0]?.total || 0,
        previous: lastMonthRevenue[0]?.total || 0,
        growth: calculateGrowth(
          thisMonthRevenue[0]?.total || 0,
          lastMonthRevenue[0]?.total || 0
        )
      }
    };
  }

  /**
   * Obtient les statistiques d'engagement
   */
  async getEngagementStats() {
    const totalArticles = await Article.countDocuments({ status: 'published' });
    const totalViews = await Article.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);
    const totalLikes = await Article.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: null, total: { $sum: '$likes' } } }
    ]);

    const avgViews = totalArticles > 0 ? (totalViews[0]?.total || 0) / totalArticles : 0;
    const avgLikes = totalArticles > 0 ? (totalLikes[0]?.total || 0) / totalArticles : 0;
    const engagementRate = totalViews[0]?.total > 0 
      ? ((totalLikes[0]?.total || 0) / totalViews[0].total) * 100 
      : 0;

    return {
      totalViews: totalViews[0]?.total || 0,
      totalLikes: totalLikes[0]?.total || 0,
      avgViews: Math.round(avgViews),
      avgLikes: Math.round(avgLikes),
      engagementRate: engagementRate.toFixed(2)
    };
  }
}

module.exports = new AnalyticsService();
