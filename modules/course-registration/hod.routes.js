const express = require('express');
const router = express.Router();

const deptCtrl = require('./department/department.controller');
const blueprintCtrl = require('./blueprint/blueprint.controller');
const courseCtrl = require('./course/course.controller');
const programCtrl = require('./program/program.controller');
const enrollmentCtrl = require('./enrollment/enrollment.controller');
const prefCtrl = require('./preference/preference.controller');
const allocCtrl = require('./allocation/allocation.controller');
const courseAssignCtrl = require('./course-assignment/course-assignment.controller');

// All routes here pass through: authenticate -> authorize(HOD) -> loadCRProfile

router.get('/info', deptCtrl.hodInfo);

router.route('/blueprint')
  .get(blueprintCtrl.get)
  .put(blueprintCtrl.upsert);

router.route('/courses')
  .get(courseCtrl.hodList)
  .post(courseCtrl.create)
  .put(courseCtrl.update)
  .delete(courseCtrl.remove);

router.route('/programs')
  .get(programCtrl.list)
  .post(programCtrl.create)
  .put(programCtrl.update)
  .delete(programCtrl.remove);

router.get('/students', enrollmentCtrl.hodList);
router.post('/bulk-admissions', enrollmentCtrl.bulkCreate);

router.get('/defaulters', prefCtrl.defaulters);

router.get('/allocation-results', allocCtrl.hodResults);
router.put('/manual-assign', allocCtrl.manualAssign);

// Course assignments for teachers
router.post('/course-assignments', courseAssignCtrl.assign);

module.exports = router;
