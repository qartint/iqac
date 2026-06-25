const Course = require('./course.model');
const CourseAssignment = require('../course-assignment/course-assignment.model');

const hodList = async (req, res) => {
  try {
    const courses = await Course.find({ department_id: req.user.department_id }).sort({ course_code: 1 }).lean();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const create = async (req, res) => {
  try {
    const data = req.body;
    const course = await Course.create({ ...data, department_id: req.user.department_id });
    res.status(201).json(course);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Course code exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const course = await Course.findOneAndUpdate(
      { _id: id, department_id: req.user.department_id },
      data,
      { new: true }
    );
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    await Course.findOneAndDelete({ _id: req.query.id, department_id: req.user.department_id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const teacherList = async (req, res) => {
  try {
    const assignments = await CourseAssignment.find({ teacher_id: req.user.id })
      .populate('course_id')
      .lean();
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { hodList, create, update, remove, teacherList };
