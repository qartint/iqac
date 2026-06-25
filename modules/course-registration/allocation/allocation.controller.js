const AllocationJob = require('./allocation-job.model');
const Allocation = require('./allocation.model');
const { getAllocationQueue } = require('../../../queues/allocationQueue');

const triggerJob = async (req, res) => {
  try {
    const { academic_year, semester_type } = req.body;
    
    const existingJob = await AllocationJob.findOne({ academic_year, semester_type });
    if (existingJob && ['QUEUED', 'RUNNING'].includes(existingJob.status)) {
      return res.status(409).json({ error: 'Job already running for this term' });
    }

    let jobDoc;
    if (existingJob) {
      existingJob.status = 'QUEUED';
      jobDoc = await existingJob.save();
    } else {
      jobDoc = await AllocationJob.create({ academic_year, semester_type });
    }

    const allocationQueue = getAllocationQueue();
    await allocationQueue.add('runAllocation', {
      academic_year,
      semester_type,
      job_id: jobDoc._id.toString()
    });

    res.status(202).json({ job_id: jobDoc._id, message: 'Allocation queued' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getJobStatus = async (req, res) => {
  try {
    const { academic_year, semester_type } = req.query;
    const job = await AllocationJob.findOne({ academic_year, semester_type }).lean();
    if (!job) return res.status(404).json({ error: 'No job found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const hodResults = async (req, res) => {
  try {
    const { academic_year, semester } = req.query;
    const allocations = await Allocation.find({ 
      department_id: req.user.department_id, 
      academic_year, 
      semester: parseInt(semester) 
    }).populate('student_id', 'email').populate('slots.course_id').lean();
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const manualAssign = async (req, res) => {
  try {
    const { allocation_id, slot, course_id, note } = req.body;
    
    // Validate HOD owns this allocation
    const allocation = await Allocation.findOne({ _id: allocation_id, department_id: req.user.department_id });
    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });

    const targetSlot = allocation.slots.find(s => s.slot === slot);
    if (!targetSlot) return res.status(400).json({ error: 'Slot not found' });

    targetSlot.status = 'MANUALLY_ALLOCATED';
    targetSlot.course_id = course_id;
    targetSlot.allocated_by = 'HOD';
    targetSlot.hod_note = note;

    await allocation.save();
    res.json(allocation);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const studentResults = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const alloc = await Allocation.findOne({ 
      student_id: req.user.id, 
      academic_year, 
      semester: req.user.current_semester 
    }).populate('slots.course_id').lean();
    
    res.json(alloc || { slots: [] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { triggerJob, getJobStatus, hodResults, manualAssign, studentResults };
