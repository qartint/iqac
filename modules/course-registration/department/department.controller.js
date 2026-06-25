const Department = require('../../../models/Department');

const getAll = async (req, res) => {
  try {
    const departments = await Department.find().populate('campus_id', 'name').sort({ name: 1 }).lean();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const create = async (req, res) => {
  try {
    const { name, code, campus_id } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and code required' });
    const dept = await Department.create({ name, code, campus_id });
    res.status(201).json(dept);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Department already exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const { id, name, code, campus_id } = req.body;
    const dept = await Department.findByIdAndUpdate(id, { name, code, campus_id }, { new: true });
    if (!dept) return res.status(404).json({ error: 'Not found' });
    res.json(dept);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    await Department.findByIdAndDelete(req.query.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getHODs = async (req, res) => {
  try {
    const depts = await Department.find().populate('hod', 'email username').lean();
    res.json(depts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const assignHOD = async (req, res) => {
  try {
    const { department_id, user_id } = req.body;
    const dept = await Department.findByIdAndUpdate(department_id, { hod: user_id }, { new: true });
    res.json(dept);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const hodInfo = async (req, res) => {
  try {
    const dept = await Department.findById(req.user.department_id).populate('campus_id').lean();
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    res.json(dept);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getAll, create, update, remove, getHODs, assignHOD, hodInfo };
