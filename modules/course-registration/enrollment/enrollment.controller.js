const { bulkAdmissions } = require('./enrollment.service');
const StudentEnrollment = require('./enrollment.model');

const bulkCreate = async (req, res) => {
  try {
    const rows = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: 'Expected an array of rows' });
    }

    // req.user.department_id and campus_id are injected by loadCRProfile
    const result = await bulkAdmissions(rows, req.user.department_id, req.user.campus_id);
    
    res.json({
      inserted_count: result.inserted_count,
      error_count: result.error_count,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('bulkCreate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const hodList = async (req, res) => {
  try {
    // Return all enrollments for this HOD's department
    const students = await StudentEnrollment.find({ department_id: req.user.department_id })
      .populate('user_id', 'email')
      .populate('student_profile_id', 'personalInfo')
      .populate('program_id', 'name code')
      .lean();

    res.json(students);
  } catch (error) {
    console.error('hodList error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const studentInfo = async (req, res) => {
  try {
    const info = await StudentEnrollment.findOne({ user_id: req.user.id })
      .populate('department_id', 'name code')
      .populate('campus_id', 'name code')
      .populate('program_id', 'name code semesters')
      .lean();

    if (!info) return res.status(404).json({ error: 'Enrollment not found' });
    res.json(info);
  } catch (error) {
    console.error('studentInfo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  bulkCreate,
  hodList,
  studentInfo
};
