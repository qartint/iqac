const express = require('express');
const router = express.Router();

const authenticate = require('../../auth/middleware/authenticate');
const authorize = require('../../auth/middleware/authorize');
const { ROLES } = require('../../auth/constants/roles');
const loadCRProfile = require('./middleware/loadCRProfile');

const superadminRoutes = require('./superadmin.routes');
const hodRoutes = require('./hod.routes');
const teacherRoutes = require('./teacher.routes');
const studentRoutes = require('./student.routes');

// Mount Superadmin Routes: No loadCRProfile
router.use('/superadmin', authenticate, authorize(ROLES.SUPERADMIN), superadminRoutes);

// Mount Teacher Routes: No loadCRProfile
router.use('/teacher', authenticate, authorize(ROLES.FACULTY), teacherRoutes);

// Mount HOD Routes: Requires loadCRProfile
router.use('/hod', authenticate, authorize(ROLES.HOD), loadCRProfile, hodRoutes);

// Mount Student Routes: Requires loadCRProfile
router.use('/student', authenticate, authorize(ROLES.STUDENT), loadCRProfile, studentRoutes);

module.exports = router;
