const express = require('express');
const router = express.Router();

const campusCtrl = require('./campus/campus.controller');
const deptCtrl = require('./department/department.controller');
const allocCtrl = require('./allocation/allocation.controller');
const courseAssignCtrl = require('./course-assignment/course-assignment.controller');

// All routes here pass through: authenticate -> authorize(SUPERADMIN)

router.route('/campus')
  .get(campusCtrl.getAll)
  .post(campusCtrl.create)
  .put(campusCtrl.update)
  .delete(campusCtrl.remove);

router.route('/departments')
  .get(deptCtrl.getAll)
  .post(deptCtrl.create)
  .put(deptCtrl.update)
  .delete(deptCtrl.remove);

router.route('/hod')
  .get(deptCtrl.getHODs)
  .post(deptCtrl.assignHOD);

router.route('/allocate')
  .get(allocCtrl.getJobStatus)
  .post(allocCtrl.triggerJob);

router.route('/course-assignments')
  .get(courseAssignCtrl.getAssignments)
  .post(courseAssignCtrl.assign)
  .delete(courseAssignCtrl.remove);

module.exports = router;
