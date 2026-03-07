const express = require('express');
const adminUserController = require('../controllers/admin.user.controller');
const { protect, adminOnly } = require('../middlewares');

const router = express.Router();

router.use(protect, adminOnly);

router.get('/users', adminUserController.getAllUsers);
router.put('/users/:id', adminUserController.updateUser);
router.delete('/users/:id', adminUserController.deleteUser);

module.exports = router;
