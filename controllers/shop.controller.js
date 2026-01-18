const Shop = require('../models/shop.model');
const cloudinary = require('../config/cloudinary');

// Obtenir les informations de la boutique
exports.getShopInfo = async (req, res) => {
  try {
    const shop = await Shop.findOne().populate('createdBy', 'name email');
    
    if (!shop) {
      return res.status(404).json({
        status: 'error',
        message: 'Boutique non configurée'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { shop }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des informations'
    });
  }
};

// Créer ou mettre à jour la boutique (Admin seulement)
exports.updateShop = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Gérer l'upload du logo
    if (req.files && req.files.logo) {
      const logoResult = await cloudinary.uploader.upload(req.files.logo.tempFilePath, {
        folder: 'adlam/shop',
        resource_type: 'image'
      });
      updateData.logo = logoResult.secure_url;
      updateData.logoPublicId = logoResult.public_id;
    }

    // Gérer l'upload de la bannière
    if (req.files && req.files.banner) {
      const bannerResult = await cloudinary.uploader.upload(req.files.banner.tempFilePath, {
        folder: 'adlam/shop',
        resource_type: 'image'
      });
      updateData.banner = bannerResult.secure_url;
      updateData.bannerPublicId = bannerResult.public_id;
    }

    let shop = await Shop.findOne();
    
    if (shop) {
      // Supprimer les anciennes images si de nouvelles sont uploadées
      if (updateData.logoPublicId && shop.logoPublicId) {
        await cloudinary.uploader.destroy(shop.logoPublicId);
      }
      if (updateData.bannerPublicId && shop.bannerPublicId) {
        await cloudinary.uploader.destroy(shop.bannerPublicId);
      }
      
      shop = await Shop.findByIdAndUpdate(shop._id, updateData, { 
        new: true, 
        runValidators: true 
      });
    } else {
      updateData.createdBy = req.user._id;
      shop = await Shop.create(updateData);
    }

    res.status(200).json({
      status: 'success',
      data: { shop }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Erreur lors de la mise à jour'
    });
  }
};