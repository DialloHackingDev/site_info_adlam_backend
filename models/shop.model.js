const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  logo: {
    type: String,
    default: null
  },
  logoPublicId: {
    type: String,
    default: null
  },
  banner: {
    type: String,
    default: null
  },
  bannerPublicId: {
    type: String,
    default: null
  },
  contact: {
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      default: null
    },
    address: {
      type: String,
      default: null
    }
  },
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    website: String
  },
  settings: {
    currency: {
      type: String,
      default: 'GNF',
      enum: ['GNF', 'USD', 'EUR']
    },
    language: {
      type: String,
      default: 'fr',
      enum: ['fr', 'en', 'pular']
    },
    timezone: {
      type: String,
      default: 'Africa/Conakry'
    }
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'closed'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Shop', shopSchema);