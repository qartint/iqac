const Marks = require('./marks.model');
const InternalMark = require('./internal-mark.model');
const CourseAssignment = require('../course-assignment/course-assignment.model');
const StudentEnrollment = require('../enrollment/enrollment.model');

// Make sure the teacher is actually assigned to this course
const verifyTeacherCourse = async (teacher_id, course_id, academic_year, semester) => {
  const assignment = await CourseAssignment.findOne({ teacher_id, course_id, academic_year, semester });
  return !!assignment;
};

const get = async (req, res) => {
  try {
    const { course_id, academic_year, semester } = req.query;
    if (!(await verifyTeacherCourse(req.user.id, course_id, academic_year, semester))) {
      return res.status(403).json({ error: 'Not assigned to this course' });
    }

    const marks = await InternalMark.find({ course_id, academic_year, semester }).populate('student_id', 'email').lean();
    res.json(marks);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const create = async (req, res) => {
  try {
    const { course_id, course_code, academic_year, semester, component, marks_data } = req.body;
    if (!(await verifyTeacherCourse(req.user.id, course_id, academic_year, semester))) {
      return res.status(403).json({ error: 'Not assigned to this course' });
    }

    const docs = marks_data.map(m => ({
      student_id: m.student_id,
      course_id,
      course_code,
      academic_year,
      semester,
      component,
      score: m.score,
      max_score: m.max_score,
      entered_by: req.user.id
    }));

    await InternalMark.insertMany(docs);
    res.status(201).json({ success: true, count: docs.length });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const { id, score } = req.body;
    const mark = await InternalMark.findOneAndUpdate(
      { _id: id, entered_by: req.user.id },
      { score },
      { new: true }
    );
    if (!mark) return res.status(404).json({ error: 'Mark not found or unauthorized' });
    res.json(mark);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const studentsInCourse = async (req, res) => {
  try {
    const { course_id, academic_year, semester } = req.query;
    if (!(await verifyTeacherCourse(req.user.id, course_id, academic_year, semester))) {
      return res.status(403).json({ error: 'Not assigned to this course' });
    }

    // Logic to find students allocated to this course
    const Allocation = require('../allocation/allocation.model');
    const allocations = await Allocation.find({
      academic_year,
      semester,
      'slots.status': 'ALLOCATED',
      'slots.course_id': course_id
    }).populate('student_id', 'email');

    const students = allocations.map(a => a.student_id);
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { get, create, update, studentsInCourse };
