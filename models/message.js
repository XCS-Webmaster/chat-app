const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  msg: String,
  name: String,
  avatar: String,
  senderId: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
