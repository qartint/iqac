const mongoose = require('mongoose');

const StudentEnrollmentSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    student_profile_id: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', default: null },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
    program_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', default: null },
    current_semester: { type: Number, min: 1, max: 10, default: 1 },
    cap_application_number: { type: String, sparse: true, unique: true },
    academic_year_joined: { type: String },
    roll_number: { type: String, sparse: true, unique: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentEnrollment', StudentEnrollmentSchema);
