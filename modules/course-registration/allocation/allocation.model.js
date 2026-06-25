const mongoose = require('mongoose');

const AllocationSlotSchema = new mongoose.Schema(
  {
    slot: { type: Number, required: true },
    type: { type: String, required: true, enum: ['FIXED', 'ELECTIVE'] },
    status: {
      type: String,
      required: true,
      enum: ['ALLOCATED', 'UNALLOCATED', 'MANUALLY_ALLOCATED'],
    },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    preference_rank_given: { type: Number },
    score: { type: Number },
    allocated_by: { type: String, enum: ['SYSTEM', 'ALGORITHM', 'HOD'] },
    hod_note: { type: String },
  },
  { _id: false }
);

const AllocationSchema = new mongoose.Schema(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
    semester: { type: Number, required: true },
    semester_type: { type: String, required: true, enum: ['ODD', 'EVEN'] },
    academic_year: { type: String, required: true },
    allocation_run_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    total_credits: { type: Number, default: 0 },
    slots: { type: [AllocationSlotSchema], default: [] },
  },
  { timestamps: true }
);

AllocationSchema.index({ student_id: 1, semester: 1, academic_year: 1 }, { unique: true });
AllocationSchema.index({ department_id: 1, semester: 1, academic_year: 1 });
AllocationSchema.index({ academic_year: 1, semester_type: 1 });

module.exports = mongoose.model('Allocation', AllocationSchema);
