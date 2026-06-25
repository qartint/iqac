const express = require('express');
const router = express.Router();

const enrollmentCtrl = require('./enrollment/enrollment.controller');
const blueprintCtrl = require('./blueprint/blueprint.controller');
const prefCtrl = require('./preference/preference.controller');
const allocCtrl = require('./allocation/allocation.controller');

// All routes here pass through: authenticate -> authorize(STUDENT) -> loadCRProfile

router.get('/info', enrollmentCtrl.studentInfo);
router.get('/blueprint', blueprintCtrl.studentView);

router.route('/preferences')
  .get(prefCtrl.get)
  .post(prefCtrl.submit);

router.get('/results', allocCtrl.studentResults);

module.exports = router;
