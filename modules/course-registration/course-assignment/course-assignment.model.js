const mongoose = require('mongoose');

const CourseAssignmentSchema = new mongoose.Schema(
  {
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    academic_year: { type: String, required: true },
    semester: { type: Number, required: true, min: 1, max: 10 },
  },
  { timestamps: true }
);

CourseAssignmentSchema.index({ teacher_id: 1, course_id: 1, academic_year: 1 }, { unique: true });
CourseAssignmentSchema.index({ course_id: 1, academic_year: 1 });

module.exports = mongoose.model('CourseAssignment', CourseAssignmentSchema);
