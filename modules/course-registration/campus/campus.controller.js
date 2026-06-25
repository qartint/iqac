const Campus = require('./campus.model');

const getAll = async (req, res) => {
  try {
    const campuses = await Campus.find().sort({ name: 1 }).lean();
    res.json(campuses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const create = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and code are required' });
    
    const campus = await Campus.create({ name, code });
    res.status(201).json(campus);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Campus already exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const { id, name, code } = req.body;
    const campus = await Campus.findByIdAndUpdate(id, { name, code }, { new: true });
    if (!campus) return res.status(404).json({ error: 'Campus not found' });
    res.json(campus);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.query;
    await Campus.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getAll, create, update, remove };
