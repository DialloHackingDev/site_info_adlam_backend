const express = require('express');
const couponController = require('../controllers/coupon.controller');
const { protect, adminOnly } = require('../middlewares');

const router = express.Router();

// Routes publiques
router.post('/validate', couponController.validateCoupon);

// Routes admin
router.use(protect, adminOnly);
router.post('/', couponController.createCoupon);
router.get('/', couponController.getCoupons);
router.get('/stats', couponController.getCouponStats);
router.put('/:id', couponController.updateCoupon);
router.delete('/:id', couponController.deleteCoupon);

module.exports = router;
