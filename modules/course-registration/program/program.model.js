const mongoose = require('mongoose');

const ProgramSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semesters: { type: Number, required: true, min: 1, max: 12 },
    papers_per_semester: { type: Number, required: true, default: 4, min: 1, max: 10 },
    eligibility: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Program', ProgramSchema);
