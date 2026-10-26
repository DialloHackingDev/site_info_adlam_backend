const ContactMessage = require('../models/contact-message.model');

// Envoyer un message de contact
exports.sendMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation des champs requis
    if (!name || !email || !message ||
        typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Nom, email et message sont obligatoires'
      });
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Format d\'email invalide'
      });
    }

    await ContactMessage.create({
      name,
      email,
      subject: typeof subject === 'string' ? subject : undefined,
      message,
      ipAddress: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Message envoyé avec succès'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'error',
        message: 'Message invalide ou trop long'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Erreur interne du serveur'
    });
  }
};

// Admin : lister les messages
exports.getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20, read } = req.query;
    const query = {};
    if (read !== undefined) query.read = read === 'true';

    const [messages, total] = await Promise.all([
      ContactMessage.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      ContactMessage.countDocuments(query)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des messages'
    });
  }
};

// Admin : lire un message
exports.getMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ status: 'error', message: 'Message non trouvé' });
    }
    res.status(200).json({ status: 'success', data: { message } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Erreur lors de la récupération du message' });
  }
};

// Admin : marquer comme lu
exports.markAsRead = async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!message) {
      return res.status(404).json({ status: 'error', message: 'Message non trouvé' });
    }
    res.status(200).json({ status: 'success', data: { message } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Erreur lors de la mise à jour' });
  }
};

// Admin : supprimer un message
exports.deleteMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ status: 'error', message: 'Message non trouvé' });
    }
    res.status(200).json({ status: 'success', message: 'Message supprimé' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Erreur lors de la suppression' });
  }
};
