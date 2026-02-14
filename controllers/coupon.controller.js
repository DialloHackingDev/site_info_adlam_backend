const Coupon = require('../models/coupon.model');

// Valider un coupon
exports.validateCoupon = async (req, res) => {
  try {
    const { code, amount } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Code promo invalide'
      });
    }

    if (!coupon.isValid()) {
      return res.status(400).json({
        status: 'error',
        message: 'Ce code promo a expiré ou n\'est plus valide'
      });
    }

    if (!coupon.canApplyToAmount(amount)) {
      return res.status(400).json({
        status: 'error',
        message: `Montant minimum requis : ${coupon.minPurchaseAmount} GNF`
      });
    }

    const discount = coupon.calculateDiscount(amount);

    res.status(200).json({
      status: 'success',
      data: {
        coupon: {
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discount,
          finalAmount: amount - discount
        }
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la validation du coupon'
    });
  }
};

// Appliquer un coupon (lors du checkout)
exports.applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon || !coupon.isValid()) {
      return res.status(400).json({
        status: 'error',
        message: 'Code promo invalide'
      });
    }

    await coupon.incrementUsage();

    res.status(200).json({
      status: 'success',
      message: 'Code promo appliqué avec succès'
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de l\'application du coupon'
    });
  }
};

// Admin: Créer un coupon
exports.createCoupon = async (req, res) => {
  try {
    const couponData = {
      ...req.body,
      createdBy: req.user._id
    };

    const coupon = await Coupon.create(couponData);

    res.status(201).json({
      status: 'success',
      data: { coupon }
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Erreur lors de la création du coupon'
    });
  }
};

// Admin: Liste des coupons
exports.getCoupons = async (req, res) => {
  try {
    const { active, expired } = req.query;
    const query = {};

    if (active === 'true') {
      query.isActive = true;
      query.validUntil = { $gte: new Date() };
    }

    if (expired === 'true') {
      query.validUntil = { $lt: new Date() };
    }

    const coupons = await Coupon.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: coupons.length,
      data: { coupons }
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des coupons'
    });
  }
};

// Admin: Mettre à jour un coupon
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Coupon non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { coupon }
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Erreur lors de la mise à jour du coupon'
    });
  }
};

// Admin: Supprimer un coupon
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Coupon non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Coupon supprimé avec succès'
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la suppression du coupon'
    });
  }
};

// Admin: Statistiques des coupons
exports.getCouponStats = async (req, res) => {
  try {
    const stats = await Coupon.aggregate([
      {
        $group: {
          _id: null,
          totalCoupons: { $sum: 1 },
          activeCoupons: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$isActive', true] },
                    { $gte: ['$validUntil', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          },
          totalUsage: { $sum: '$usageCount' }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: { stats: stats[0] || { totalCoupons: 0, activeCoupons: 0, totalUsage: 0 } }
    });
  } catch (error) {
    console.error('Error fetching coupon stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};
