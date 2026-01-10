const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:{
    type:String,
    
  },
    email:{
    type:String,
    required:true,
    unique:true,
    lowercase:true
    },
    password:{
    type:String,
    required:true,
    minlength:6,
    select:false 
    },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User",userSchema);