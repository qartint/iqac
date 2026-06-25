const Program = require('./program.model');

const list = async (req, res) => {
  try {
    const programs = await Program.find({ department_id: req.user.department_id }).sort({ name: 1 }).lean();
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const create = async (req, res) => {
  try {
    const { name, code, semesters, papers_per_semester, eligibility } = req.body;
    const program = await Program.create({
      name, code, semesters, papers_per_semester, eligibility,
      department_id: req.user.department_id
    });
    res.status(201).json(program);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Program code exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const program = await Program.findOneAndUpdate(
      { _id: id, department_id: req.user.department_id },
      data,
      { new: true }
    );
    if (!program) return res.status(404).json({ error: 'Program not found' });
    res.json(program);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    await Program.findOneAndDelete({ _id: req.query.id, department_id: req.user.department_id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { list, create, update, remove };
