const Faculty = require('../../../models/Faculty');
const StudentEnrollment = require('../enrollment/enrollment.model');

const loadCRProfile = async (req, res, next) => {
  try {
    const { id, role } = req.user;

    if (role === 'student') {
      const enrollment = await StudentEnrollment.findOne({ user_id: id });
      if (!enrollment) {
        return res.status(400).json({ error: 'CR profile not set up for this student account.' });
      }
      req.user.department_id = enrollment.department_id;
      req.user.campus_id = enrollment.campus_id;
      req.user.program_id = enrollment.program_id;
      req.user.current_semester = enrollment.current_semester;
    } else {
      // For faculty, hod, and campus_director
      const faculty = await Faculty.findOne({ userId: id });
      if (!faculty) {
         return res.status(400).json({ error: 'CR profile not set up for this faculty account.' });
      }
      if (!faculty.department_id || !faculty.campus_id) {
         return res.status(400).json({ error: 'Department and Campus must be assigned to your profile.' });
      }
      req.user.department_id = faculty.department_id;
      req.user.campus_id = faculty.campus_id;
    }
    
    next();
  } catch (error) {
    console.error('loadCRProfile error:', error);
    res.status(500).json({ error: 'Failed to load CR profile context.' });
  }
};

module.exports = loadCRProfile;
