require('dotenv').config({ path: __dirname + '/../.env' });
const { Worker } = require('bullmq');
const mongoose = require('mongoose');

// Wait for connection to Mongoose before processing jobs
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Worker connected to MongoDB'))
  .catch(err => console.error('Worker MongoDB connection error:', err));

const AllocationJob = require('../modules/course-registration/allocation/allocation-job.model');
const { runAllocation } = require('../modules/course-registration/allocation/allocation.service');

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379'
};

const worker = new Worker('allocationQueue', async job => {
  const { academic_year, semester_type, job_id } = job.data;
  console.log(`[Worker] Started allocation job: ${job_id}`);

  // Update job status to RUNNING
  await AllocationJob.findByIdAndUpdate(job_id, {
    status: 'RUNNING',
    started_at: new Date()
  });

  try {
    const summary = await runAllocation({
      academic_year,
      semester_type,
      allocation_run_id: job_id
    });

    // Mark as COMPLETE
    await AllocationJob.findByIdAndUpdate(job_id, {
      status: 'COMPLETE',
      completed_at: new Date(),
      summary
    });

    console.log(`[Worker] Completed allocation job: ${job_id}`, summary);
    return summary;

  } catch (error) {
    // Mark as FAILED
    console.error(`[Worker] Failed allocation job: ${job_id}`, error);
    await AllocationJob.findByIdAndUpdate(job_id, {
      status: 'FAILED',
      completed_at: new Date(),
      error_message: error.message
    });
    throw error;
  }
}, { connection });

worker.on('ready', () => {
  console.log('Allocation Worker is ready and listening to allocationQueue.');
});

worker.on('error', err => {
  console.error('Allocation Worker error:', err);
});
