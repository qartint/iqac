const { Queue } = require('bullmq');

let queueInstance = null;

const getAllocationQueue = () => {
  if (!queueInstance) {
    queueInstance = new Queue('allocationQueue', { 
      connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' }
    });
  }
  return queueInstance;
};

module.exports = { getAllocationQueue };
