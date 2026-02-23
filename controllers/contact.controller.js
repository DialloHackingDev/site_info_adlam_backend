// Envoyer un message de contact
exports.sendMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation des champs requis
    if (!name || !email || !message) {
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

    // Ici vous pouvez ajouter la logique pour sauvegarder le message
    // ou l'envoyer par email

    res.status(200).json({
      status: 'success',
      message: 'Message envoyé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur interne du serveur'
    });
  }
};