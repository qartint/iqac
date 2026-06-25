const Preference = require('./preference.model');
const StudentEnrollment = require('../enrollment/enrollment.model');

const get = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const pref = await Preference.findOne({
      student_id: req.user.id,
      semester: req.user.current_semester,
      academic_year
    }).populate('slots.course_id slots.preferences.course_id').lean();
    
    res.json(pref || null);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const submit = async (req, res) => {
  try {
    const { academic_year, slots } = req.body;
    if (!academic_year || !slots) return res.status(400).json({ error: 'Missing parameters' });

    const pref = await Preference.findOneAndUpdate(
      { student_id: req.user.id, semester: req.user.current_semester, academic_year },
      { 
        department_id: req.user.department_id,
        campus_id: req.user.campus_id,
        slots,
        submitted_at: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json(pref);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Preference already submitted' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const defaulters = async (req, res) => {
  try {
    const { academic_year, semester } = req.query;
    
    // Find all enrolled students for this dept/semester
    const enrolled = await StudentEnrollment.find({ 
      department_id: req.user.department_id, 
      current_semester: parseInt(semester) 
    }).populate('user_id', 'email').lean();
    
    // Find who submitted
    const submitted = await Preference.find({
      department_id: req.user.department_id,
      semester: parseInt(semester),
      academic_year
    }).select('student_id').lean();
    
    const submittedIds = new Set(submitted.map(s => s.student_id.toString()));
    const defaultersList = enrolled.filter(e => !submittedIds.has(e.user_id._id.toString()));
    
    res.json(defaultersList);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { get, submit, defaulters };
