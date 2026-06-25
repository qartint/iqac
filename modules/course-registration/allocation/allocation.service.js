const mongoose = require('mongoose');
const Preference = require('../preference/preference.model');
const Allocation = require('./allocation.model');
const Course = require('../course/course.model');
const Marks = require('../marks/marks.model');
const StudentEnrollment = require('../enrollment/enrollment.model');

// ── Constants ─────────────────────────────────────────────────────────────────
const ODD_SEMESTERS = [1, 3, 5, 7, 9];
const EVEN_SEMESTERS = [2, 4, 6, 8, 10];

// ── Prerequisite Scorer ───────────────────────────────────────────────────────
function scoreStudent(departmentId, marks, prerequisites) {
  if (!prerequisites || prerequisites.length === 0) return 0;

  let score = 0;
  for (const prereq of prerequisites) {
    if (prereq.type === 'PAPER_REQUIRED') {
      if (prereq.course_code && (marks[prereq.course_code] || 0) > 0) score++;
    } else if (prereq.type === 'PAPER_MIN_SCORE') {
      if (prereq.course_code && prereq.min_score !== undefined) {
        if ((marks[prereq.course_code] || 0) >= prereq.min_score) score++;
      }
    } else if (prereq.type === 'DEPT_REQUIRED') {
      if (prereq.department_code && departmentId === prereq.department_code) score++;
    } else if (prereq.type === 'DEPT_EXCLUDED') {
      if (prereq.department_code && departmentId !== prereq.department_code) score++;
    }
  }
  return score;
}

// ── Main Engine ───────────────────────────────────────────────────────────────
async function runAllocation({ academic_year, semester_type, allocation_run_id }) {
  const validSemesters = semester_type === 'ODD' ? ODD_SEMESTERS : EVEN_SEMESTERS;

  // 1. Fetch ALL preferences for this academic year + semester cycle
  const preferences = await Preference.find({
    academic_year,
    semester: { $in: validSemesters },
  }).lean();

  if (preferences.length === 0) {
    throw new Error(`No preferences submitted for ${academic_year} ${semester_type} semester`);
  }

  const studentIds = preferences.map(p => p.student_id);

  // 2. Fetch all student enrollments + all marks in parallel
  // REPLACEMENT: User model swapped to StudentEnrollment per CR architecture.
  const [enrollments, allMarks] = await Promise.all([
    StudentEnrollment.find({ user_id: { $in: studentIds } }).lean(),
    Marks.find({ student_id: { $in: studentIds } }).lean(),
  ]);

  const enrollmentMap = new Map(enrollments.map(e => [e.user_id.toString(), e]));

  const marksMap = new Map();
  for (const mark of allMarks) {
    const sid = mark.student_id.toString();
    if (!marksMap.has(sid)) marksMap.set(sid, {});
    marksMap.get(sid)[mark.course_code] = mark.score;
  }

  // 3. Collect all unique course IDs across all preferences
  const allCourseIds = new Set();
  for (const pref of preferences) {
    for (const slot of pref.slots) {
      if (slot.type === 'FIXED' && slot.course_id) {
        allCourseIds.add(slot.course_id.toString());
      } else if (slot.type === 'ELECTIVE' && slot.preferences) {
        for (const p of slot.preferences) {
          allCourseIds.add(p.course_id.toString());
        }
      }
    }
  }

  // 4. Fetch all courses in one query
  const courses = await Course.find({
    _id: { $in: Array.from(allCourseIds).map(id => new mongoose.Types.ObjectId(id)) },
  }).lean();

  const courseMap = new Map(
    courses.map(c => [c._id.toString(), {
      _id: c._id.toString(),
      course_code: c.course_code,
      title: c.title,
      credits: c.credits,
      seat_limit: c.seat_limit,
      prerequisites: c.prerequisites || [],
    }])
  );

  // 5. Initialise result slots for every student
  // student_id → slot_number → SlotResult
  const results = new Map();

  for (const pref of preferences) {
    const sid = pref.student_id.toString();
    const slotMap = new Map();
    for (const slot of pref.slots) {
      slotMap.set(slot.slot, {
        slot: slot.slot,
        type: slot.type,
        status: 'UNALLOCATED',
        allocated_by: 'ALGORITHM',
      });
    }
    results.set(sid, slotMap);
  }

  // 6. ── PHASE 1: Fixed slots ────────────────────────────────────────────────
  const seatsFilled = new Map();

  for (const pref of preferences) {
    const sid = pref.student_id.toString();
    const slotMap = results.get(sid);

    for (const slot of pref.slots) {
      if (slot.type !== 'FIXED' || !slot.course_id) continue;

      const courseId = slot.course_id.toString();
      seatsFilled.set(courseId, (seatsFilled.get(courseId) || 0) + 1);

      const slotResult = slotMap.get(slot.slot);
      slotResult.status = 'ALLOCATED';
      slotResult.course_id = courseId;
      slotResult.allocated_by = 'SYSTEM';
    }
  }

  // 7. ── PHASE 2: Elective slots — university-wide, course-centric ──────────
  let maxRank = 0;
  for (const pref of preferences) {
    for (const slot of pref.slots) {
      if (slot.type === 'ELECTIVE' && slot.preferences) {
        for (const p of slot.preferences) {
          if (p.rank > maxRank) maxRank = p.rank;
        }
      }
    }
  }

  for (let rank = 1; rank <= maxRank; rank++) {
    const coursePool = new Map();

    for (const pref of preferences) {
      const sid = pref.student_id.toString();

      for (const slot of pref.slots) {
        if (slot.type !== 'ELECTIVE' || !slot.preferences) continue;

        if (results.get(sid)?.get(slot.slot)?.status === 'ALLOCATED') continue;

        const prefAtRank = slot.preferences.find(p => p.rank === rank);
        if (!prefAtRank) continue;

        const courseId = prefAtRank.course_id.toString();
        if (!coursePool.has(courseId)) coursePool.set(courseId, []);
        coursePool.get(courseId).push({
          student_id: sid,
          slot: slot.slot,
          submitted_at: pref.submitted_at,
        });
      }
    }

    for (const [courseId, candidates] of coursePool) {
      const course = courseMap.get(courseId);
      if (!course || course.seat_limit === 0) continue;

      const filled = seatsFilled.get(courseId) || 0;
      const remainingSeats = course.seat_limit - filled;
      if (remainingSeats <= 0) continue;

      const scored = candidates.map(candidate => {
        const enrollment = enrollmentMap.get(candidate.student_id);
        const marks = marksMap.get(candidate.student_id) || {};
        const score = scoreStudent(
          enrollment?.department_id?.toString() || '',
          marks,
          course.prerequisites
        );
        return { ...candidate, score };
      });

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.submitted_at.getTime() - b.submitted_at.getTime();
      });

      let allocated = 0;
      for (const winner of scored) {
        if (allocated >= remainingSeats) break;

        const slotResult = results.get(winner.student_id)?.get(winner.slot);
        if (!slotResult || slotResult.status === 'ALLOCATED') continue;

        slotResult.status = 'ALLOCATED';
        slotResult.course_id = courseId;
        slotResult.preference_rank_given = rank;
        slotResult.score = winner.score;
        slotResult.allocated_by = 'ALGORITHM';
        allocated++;
      }

      seatsFilled.set(courseId, filled + allocated);
    }
  }

  // 8. ── Save to DB ──────────────────────────────────────────────────────────
  const allocationDocs = [];

  for (const pref of preferences) {
    const sid = pref.student_id.toString();
    const enrollment = enrollmentMap.get(sid);
    if (!enrollment) continue;

    const slots = Array.from(results.get(sid).values());

    const totalCredits = slots.reduce((sum, slot) => {
      if (slot.status === 'ALLOCATED' && slot.course_id) {
        return sum + (courseMap.get(slot.course_id)?.credits || 0);
      }
      return sum;
    }, 0);

    allocationDocs.push({
      student_id: new mongoose.Types.ObjectId(sid),
      department_id: pref.department_id,
      campus_id: pref.campus_id,
      semester: pref.semester,
      semester_type,
      academic_year,
      allocation_run_id,
      total_credits: totalCredits,
      slots: slots.map(slot => ({
        slot: slot.slot,
        type: slot.type,
        status: slot.status,
        course_id: slot.course_id ? new mongoose.Types.ObjectId(slot.course_id) : undefined,
        preference_rank_given: slot.preference_rank_given,
        score: slot.score,
        allocated_by: slot.allocated_by,
      })),
    });
  }

  await Allocation.insertMany(allocationDocs);

  // 9. Summary
  const totalStudents = allocationDocs.length;
  const fullyAllocated = allocationDocs.filter(d =>
    d.slots.every(s => s.type === 'FIXED' || s.status === 'ALLOCATED')
  ).length;
  const unallocatedCount = allocationDocs.filter(d =>
    d.slots.some(s => s.type === 'ELECTIVE' && s.status === 'UNALLOCATED')
  ).length;

  return {
    total_students: totalStudents,
    fully_allocated: fullyAllocated,
    unallocated_count: unallocatedCount,
    allocation_run_id: allocation_run_id.toString(),
  };
}

module.exports = {
  runAllocation,
};
