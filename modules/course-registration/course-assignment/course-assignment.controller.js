const CourseAssignment = require('./course-assignment.model');

const assign = async (req, res) => {
  try {
    const { teacher_id, course_id, academic_year, semester } = req.body;
    
    // In IQAC, Superadmin / HOD assigns teachers.
    // If HOD is calling this, ensure course belongs to their dept.
    if (req.user.role === 'hod') {
      const Course = require('../course/course.model');
      const course = await Course.findOne({ _id: course_id, department_id: req.user.department_id });
      if (!course) return res.status(403).json({ error: 'Course does not belong to your department' });
    }

    const assignment = await CourseAssignment.create({
      teacher_id,
      course_id,
      academic_year,
      semester
    });
    
    res.status(201).json(assignment);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Teacher already assigned to this course' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAssignments = async (req, res) => {
  try {
    const { academic_year, semester } = req.query;
    let filter = { academic_year, semester };
    
    const assignments = await CourseAssignment.find(filter)
      .populate('teacher_id', 'email')
      .populate('course_id')
      .lean();
      
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.query;
    await CourseAssignment.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { assign, getAssignments, remove };
