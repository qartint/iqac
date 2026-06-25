const mongoose = require('mongoose');

const PrerequisiteSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['PAPER_REQUIRED', 'PAPER_MIN_SCORE', 'DEPT_REQUIRED', 'DEPT_EXCLUDED', 'QUOTA_RESERVED'],
    },
    course_code: { type: String },
    min_score: { type: Number },
    department_code: { type: String },
    seats: { type: Number },
  },
  { _id: false }
);

const CourseSchema = new mongoose.Schema(
  {
    course_code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    program_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', default: null },
    semester: { type: Number, required: true, min: 1, max: 10 },
    credits: { type: Number, required: true, min: 1 },
    category: {
      type: String,
      required: true,
      enum: ['INT', 'FWD', 'RPH', 'CIP', 'DSS', 'DSC', 'DSE', 'VAC', 'SEC', 'MDC', 'MOOC', 'AEC'],
    },
    tag: { type: String, default: null },
    seat_limit: { type: Number, default: 0 },
    prerequisites: { type: [PrerequisiteSchema], default: [] },
  },
  { timestamps: true }
);

CourseSchema.index({ department_id: 1, semester: 1 });
CourseSchema.index({ tag: 1 });

module.exports = mongoose.model('Course', CourseSchema);
