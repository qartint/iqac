const mongoose = require('mongoose');

const CampusSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  },
  { timestamps: true, collection: 'campuses' }
);

module.exports = mongoose.model('Campus', CampusSchema);
