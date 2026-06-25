const bcrypt = require('bcryptjs');
const User = require('../../../auth/models/User.model');
const StudentProfile = require('../../student/models/StudentProfile');
const StudentEnrollment = require('./enrollment.model');

async function bulkAdmissions(rows, department_id, campus_id) {
  let insertedCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const { cap_application_number, date_of_birth, full_name, email } = row;

    const issues = [];
    if (!cap_application_number) issues.push('Missing CAP number');
    if (!date_of_birth) issues.push('Missing date of birth');
    if (!full_name) issues.push('Missing full name');

    if (issues.length > 0) {
      errors.push({ row: rowNumber, issues });
      errorCount++;
      continue;
    }

    try {
      // Check if student already exists in StudentEnrollment
      const existingStudent = await StudentEnrollment.findOne({ cap_application_number });
      if (existingStudent) {
        issues.push(`CAP number ${cap_application_number} already exists`);
        errors.push({ row: rowNumber, issues });
        errorCount++;
        continue;
      }

      const hashedPassword = await bcrypt.hash(date_of_birth, 12);
      const dummyEmail = email || `${cap_application_number.toLowerCase()}@student.kannuruniversity.ac.in`;

      // 1. Create User (Identity)
      const user = await User.create({
        username: cap_application_number, // or whatever username strategy
        email: dummyEmail.toLowerCase().trim(),
        password: hashedPassword,
        role: 'student',
        isActive: true,
      });

      // 2. Create StudentProfile
      const profile = await StudentProfile.create({
        userId: user._id,
        personalInfo: {
          firstName: full_name,
          dateOfBirth: date_of_birth
        }
      });

      // 3. Create StudentEnrollment
      await StudentEnrollment.create({
        user_id: user._id,
        student_profile_id: profile._id,
        department_id,
        campus_id,
        cap_application_number,
        current_semester: 1,
        is_active: true,
      });

      insertedCount++;
    } catch (err) {
      issues.push(err.message || 'Database error');
      errors.push({ row: rowNumber, issues });
      errorCount++;
    }
  }

  return { inserted_count: insertedCount, error_count: errorCount, errors };
}

module.exports = {
  bulkAdmissions
};
