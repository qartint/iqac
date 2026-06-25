const mongoose = require('mongoose');

const AllocationJobSchema = new mongoose.Schema(
  {
    academic_year: { type: String, required: true },
    semester_type: { type: String, required: true, enum: ['ODD', 'EVEN'] },
    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'COMPLETE', 'FAILED'],
      default: 'QUEUED',
    },
    allocation_run_id: { type: mongoose.Schema.Types.ObjectId },
    started_at: { type: Date },
    completed_at: { type: Date },
    error_message: { type: String },
    summary: {
      total_students: { type: Number },
      fully_allocated: { type: Number },
      unallocated_count: { type: Number },
    },
  },
  { timestamps: true }
);

AllocationJobSchema.index({ academic_year: 1, semester_type: 1 }, { unique: true });

module.exports = mongoose.model('AllocationJob', AllocationJobSchema);
