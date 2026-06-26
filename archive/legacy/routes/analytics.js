const express = require("express");
const Metric = require("../modules/analytics/models/Metric");
const Faculty = require("../models/Faculty");

// Course Registration Models
const StudentEnrollment = require("../modules/course-registration/enrollment/enrollment.model");
const Course = require("../modules/course-registration/course/course.model");
const Program = require("../modules/course-registration/program/program.model");
const Preference = require("../modules/course-registration/preference/preference.model");
const Allocation = require("../modules/course-registration/allocation/allocation.model");
const Marks = require("../modules/course-registration/marks/marks.model");
const CourseAssignment = require("../modules/course-registration/course-assignment/course-assignment.model");
const {
    calculateMetric,
    getStudentProfileCompletion,
    getStudentProfileSummary,
    getStudentDepartments,
    getProgramLevels
} = require("../modules/analytics/services/analyticsService");

console.log("Metric =", Metric);

console.log("Metric type:", typeof Metric);
console.log("Metric name:", Metric?.modelName);

const router = express.Router();

router.get("/metrics", async (req, res) => {
  try {
    const metrics = await Metric.find();
    res.json(metrics);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});
router.get("/coverage", async (req, res) => {

    try {

        const metrics = await Metric.find().lean();

        const totalFaculty = await Faculty.countDocuments();

        const coverage = [];

        for (const metric of metrics) {

            let recordsFound = 0;

            if (metric.collection === "faculties") {

                if (metric.formulaType === "objectSum") {

                    recordsFound = await Faculty.countDocuments({
                        [metric.fieldPath]: {
                            $exists: true
                        }
                    });

                } else {

                    recordsFound = await Faculty.countDocuments({
                        [metric.fieldPath]: {
                            $exists: true,
                            $ne: []
                        }
                    });

                }
            }

            const coveragePercent =
                totalFaculty === 0
                    ? 0
                    : Number(
                        (
                            (recordsFound / totalFaculty) * 100
                        ).toFixed(2)
                    );

            coverage.push({
                metricId: metric.metricId,
                metricName: metric.metricName,
                recordsFound,
                totalFaculty,
                coveragePercent,
                available: recordsFound > 0
            });
        }

        res.json(coverage);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: error.message
        });

    }

});
router.get("/metric/:metricId", async (req, res) => {

    try {

        const result = await calculateMetric(
            req.params.metricId
        );

        if (!result) {
            return res.status(404).json({
                message: "Metric not found"
            });
        }

        res.json(result);

    } catch(error) {

        console.error(error);

        res.status(500).json({
            message: error.message
        });

    }

});
router.get("/dashboard", async (req, res) => {

    try {

        const metrics = await Metric.find().lean();

        const dashboard = await Promise.all(
            metrics.map(metric => calculateMetric(metric.metricId))
        );

        res.json(dashboard.filter(Boolean));

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: error.message
        });

    }

});
router.get("/profile-completion", async (req, res) => {

    try {

        const result = await Faculty.aggregate([
            {
                $project: {
                    facultyName: {
                        $cond: [
                            { $ifNull: ["$personalInfo.fullName", false] },
                            "$personalInfo.fullName",
                            "$username"
                        ]
                    },
                    department: {
                        $ifNull: ["$employmentDetails.department", "Unknown"]
                    },
                    profileComplete: "$profileComplete",
                    completionPercentage: { $ifNull: ["$completionPercentage", 0] },
                    _id: 0
                }
            }
        ]);

        res.json(result);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: error.message
        });

    }

});
router.get("/profile-summary", async (req, res) => {

    try {
        const aggrResult = await Faculty.aggregate([
            {
                $group: {
                    _id: null,
                    totalFaculty: { $sum: 1 },
                    completedProfiles: { $sum: { $cond: [{ $eq: ["$profileComplete", true] }, 1, 0] } },
                    totalCompletion: { $sum: { $ifNull: ["$completionPercentage", 0] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalFaculty: 1,
                    completedProfiles: 1,
                    incompleteProfiles: { $subtract: ["$totalFaculty", "$completedProfiles"] },
                    averageCompletion: {
                        $cond: [
                            { $eq: ["$totalFaculty", 0] },
                            0,
                            { $round: [{ $divide: ["$totalCompletion", "$totalFaculty"] }, 2] }
                        ]
                    }
                }
            }
        ]);

        if (aggrResult.length > 0) {
            res.json(aggrResult[0]);
        } else {
            res.json({ totalFaculty: 0, completedProfiles: 0, incompleteProfiles: 0, averageCompletion: 0 });
        }

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: error.message
        });

    }

});
router.get("/departments", async (req, res) => {

    try {
        const result = await Faculty.aggregate([
            {
                $group: {
                    _id: { $ifNull: ["$employmentDetails.department", "Unknown"] },
                    facultyCount: { $sum: 1 },
                    totalCompletion: { $sum: { $ifNull: ["$completionPercentage", 0] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    department: "$_id",
                    facultyCount: 1,
                    averageCompletion: {
                        $round: [{ $divide: ["$totalCompletion", "$facultyCount"] }, 2]
                    }
                }
            }
        ]);

        res.json(result);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: error.message
        });

    }

});
router.get("/department-performance", async (req, res) => {

    try {
        const result = await Faculty.aggregate([
            {
                $group: {
                    _id: { $ifNull: ["$employmentDetails.department", "Unknown"] },
                    facultyCount: { $sum: 1 },
                    totalCompletion: { $sum: { $ifNull: ["$completionPercentage", 0] } },
                    publications: { $sum: { $size: { $ifNull: ["$publications", []] } } },
                    projects: { $sum: { $size: { $ifNull: ["$projects", []] } } },
                    patents: { $sum: { $size: { $ifNull: ["$patents", []] } } },
                    funding: {
                        $sum: {
                            $reduce: {
                                input: { $ifNull: ["$projects", []] },
                                initialValue: 0,
                                in: {
                                    $add: [
                                        "$$value",
                                        {
                                            $convert: {
                                                input: {
                                                    $replaceAll: {
                                                        input: { $toString: { $ifNull: ["$$this.amountSanctioned", "0"] } },
                                                        find: ",",
                                                        replacement: ""
                                                    }
                                                },
                                                to: "double",
                                                onError: 0,
                                                onNull: 0
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    department: "$_id",
                    facultyCount: 1,
                    averageCompletion: { $round: [{ $divide: ["$totalCompletion", "$facultyCount"] }, 2] },
                    publications: 1,
                    projects: 1,
                    patents: 1,
                    funding: 1
                }
            }
        ]);

        res.json(result);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: error.message
        });

    }

});
router.get(
    "/student-profile-completion",
    async (req, res) => {

        try {

            const result =
                await getStudentProfileCompletion();

            res.json(result);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: error.message
            });

        }
    }
);
router.get(
    "/student-profile-summary",
    async (req, res) => {

        try {

            const result =
                await getStudentProfileSummary();

            res.json(result);

        } catch (error) {

            res.status(500).json({
                message: error.message
            });

        }
    }
);
router.get(
    "/student-departments",
    async (req, res) => {

        try {

            const result =
                await getStudentDepartments();

            res.json(result);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: error.message
            });

        }
    }
);
router.get("/program-levels", async (req, res) => {
    try {
        const result = await getProgramLevels();
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// COURSE REGISTRATION ANALYTICS ENDPOINTS
// ==========================================

router.get("/course-registration/summary", async (req, res) => {
    try {
        const [totalCourses, totalEnrollments, totalPrograms, totalAllocations] = await Promise.all([
            Course.countDocuments(),
            StudentEnrollment.countDocuments(),
            Program.countDocuments(),
            Allocation.countDocuments()
        ]);
        res.json({
            labels: ["Total Courses", "Total Enrollments", "Total Programs", "Total Allocations"],
            values: [totalCourses, totalEnrollments, totalPrograms, totalAllocations]
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/course-registration/enrollments", async (req, res) => {
    try {
        const result = await StudentEnrollment.aggregate([
            {
                $lookup: {
                    from: "departments",
                    localField: "department_id",
                    foreignField: "_id",
                    as: "department"
                }
            },
            { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ["$department.name", "Unknown Department"] },
                    count: { $sum: 1 }
                }
            },
            {
                $project: { label: "$_id", value: "$count", _id: 0 }
            }
        ]);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/course-registration/programs", async (req, res) => {
    try {
        const result = await Program.aggregate([
            {
                $lookup: {
                    from: "departments",
                    localField: "department_id",
                    foreignField: "_id",
                    as: "department"
                }
            },
            { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ["$department.name", "Unknown Department"] },
                    count: { $sum: 1 }
                }
            },
            {
                $project: { label: "$_id", value: "$count", _id: 0 }
            }
        ]);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/course-registration/courses", async (req, res) => {
    try {
        const result = await Course.aggregate([
            {
                $group: {
                    _id: { $ifNull: ["$category", "Unknown"] },
                    count: { $sum: 1 }
                }
            },
            {
                $project: { label: "$_id", value: "$count", _id: 0 }
            }
        ]);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/course-registration/preferences", async (req, res) => {
    try {
        const result = await Preference.aggregate([
            {
                $group: {
                    _id: { semester: "$semester", academic_year: "$academic_year" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: { 
                    label: { $concat: ["Sem ", { $toString: "$_id.semester" }, " (", "$_id.academic_year", ")"] },
                    value: "$count",
                    _id: 0
                }
            }
        ]);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/course-registration/allocations", async (req, res) => {
    try {
        const result = await Allocation.aggregate([
            { $unwind: { path: "$slots", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ["$slots.status", "UNKNOWN"] },
                    count: { $sum: 1 }
                }
            },
            {
                $project: { label: "$_id", value: "$count", _id: 0 }
            }
        ]);
        
        const totals = result.reduce((acc, r) => acc + r.value, 0);
        const percentages = result.map(r => ({
            label: r.label,
            value: r.value,
            percentage: totals > 0 ? Number(((r.value / totals) * 100).toFixed(2)) : 0
        }));

        res.json({ data: percentages, totals });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/course-registration/workload", async (req, res) => {
    try {
        const result = await CourseAssignment.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "teacher_id",
                    foreignField: "_id",
                    as: "teacher"
                }
            },
            { $unwind: { path: "$teacher", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ["$teacher.username", { $ifNull: ["$teacher.name", "Unknown Faculty"] }] },
                    count: { $sum: 1 }
                }
            },
            {
                $project: { label: "$_id", value: "$count", _id: 0 }
            }
        ]);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/course-registration/marks", async (req, res) => {
    try {
        const result = await Marks.aggregate([
            {
                $group: {
                    _id: "$course_code",
                    averageScore: { $avg: "$score" },
                    passed: { $sum: { $cond: [{ $eq: ["$is_passed", true] }, 1, 0] } },
                    total: { $sum: 1 }
                }
            },
            {
                $project: {
                    label: "$_id",
                    averageScore: { $round: ["$averageScore", 2] },
                    passed: 1,
                    total: 1,
                    passPercentage: {
                        $cond: [
                            { $eq: ["$total", 0] },
                            0,
                            { $round: [{ $multiply: [{ $divide: ["$passed", "$total"] }, 100] }, 2] }
                        ]
                    },
                    _id: 0
                }
            }
        ]);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
