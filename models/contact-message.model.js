const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  email: {
    type: String,
    required: true,
    maxlength: 200,
    lowercase: true,
    trim: true
  },
  subject: {
    type: String,
    maxlength: 200,
    trim: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 5000
  },
  read: {
    type: Boolean,
    default: false
  },
  ipAddress: String
}, {
  timestamps: true
});

contactMessageSchema.index({ read: 1, createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
