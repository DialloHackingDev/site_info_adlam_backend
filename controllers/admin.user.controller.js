const User = require('../models/users.model');

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    
    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await User.countDocuments(query);
    
    res.status(200).json({ status: 'success', data: { users, total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { role, name, email } = req.body;
    const updateData = {};
    if (role) updateData.role = role;
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ status: 'error', message: 'Utilisateur non trouvé' });
    
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ status: 'error', message: 'Utilisateur non trouvé' });
    
    res.status(200).json({ status: 'success', message: 'Utilisateur supprimé' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
