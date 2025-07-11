const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  title: String,
  category: String,
  image: String // This should be like "/uploads/filename.png"
});

module.exports = mongoose.model('Service', ServiceSchema);
