const express = require('express');
const router = express.Router();

const courseCtrl = require('./course/course.controller');
const marksCtrl = require('./marks/marks.controller');

// All routes here pass through: authenticate -> authorize(FACULTY)
// NO loadCRProfile middleware required

router.get('/courses', courseCtrl.teacherList);

router.route('/marks')
  .get(marksCtrl.get)
  .post(marksCtrl.create)
  .put(marksCtrl.update);

router.get('/students', marksCtrl.studentsInCourse);

module.exports = router;
