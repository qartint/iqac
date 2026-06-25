const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema(
  {
    slot: { type: Number, required: true },
    rule: {
      type: String,
      required: true,
      enum: ['FIXED', 'DEPT_RESTRICTED', 'EXCLUDE_DEPT', 'POOL_RESTRICTED', 'GLOBAL_BASKET'],
    },
    target: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const BlueprintSchema = new mongoose.Schema(
  {
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true, min: 1, max: 10 },
    min_credits: { type: Number, default: 18 },
    max_credits: { type: Number, default: 26 },
    slots: { type: [SlotSchema], default: [] },
  },
  { timestamps: true }
);

BlueprintSchema.index({ department_id: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Blueprint', BlueprintSchema);
