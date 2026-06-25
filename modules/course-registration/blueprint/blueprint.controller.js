const Blueprint = require('./blueprint.model');

const get = async (req, res) => {
  try {
    const { semester } = req.query;
    if (!semester) return res.status(400).json({ error: 'Semester required' });

    const blueprint = await Blueprint.findOne({ 
      department_id: req.user.department_id, 
      semester: parseInt(semester) 
    }).lean();

    res.json(blueprint || { slots: [] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const upsert = async (req, res) => {
  try {
    const { semester, min_credits, max_credits, slots } = req.body;
    
    const blueprint = await Blueprint.findOneAndUpdate(
      { department_id: req.user.department_id, semester },
      { min_credits, max_credits, slots },
      { new: true, upsert: true }
    );
    res.json(blueprint);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const studentView = async (req, res) => {
  try {
    // req.user.current_semester injected by loadCRProfile for students
    const blueprint = await Blueprint.findOne({ 
      department_id: req.user.department_id, 
      semester: req.user.current_semester 
    }).lean();

    res.json(blueprint || { slots: [] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { get, upsert, studentView };
