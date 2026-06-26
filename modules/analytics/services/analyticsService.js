const Metric = require("../models/Metric");
const Faculty = require("../../faculty/models/Faculty");
const StudentProfile = require("../../student/models/StudentProfile");

// Course Registration Models
const StudentEnrollment = require("../../course-registration/enrollment/enrollment.model");
const Course = require("../../course-registration/course/course.model");
const Program = require("../../course-registration/program/program.model");
const Preference = require("../../course-registration/preference/preference.model");
const Allocation = require("../../course-registration/allocation/allocation.model");
const Marks = require("../../course-registration/marks/marks.model");
const CourseAssignment = require("../../course-registration/course-assignment/course-assignment.model");

const MODEL_MAP = {
    "faculties": Faculty,
    "studentprofiles": StudentProfile,
    "Faculty": Faculty,
    "StudentProfile": StudentProfile,
    "StudentEnrollment": StudentEnrollment,
    "Course": Course,
    "Program": Program,
    "Preference": Preference,
    "Allocation": Allocation,
    "Marks": Marks,
    "CourseAssignment": CourseAssignment,
    "studentenrollments": StudentEnrollment,
    "courses": Course,
    "programs": Program,
    "preferences": Preference,
    "allocations": Allocation,
    "marks": Marks,
    "courseassignments": CourseAssignment
};

async function calculateMetric(metricId) {



    const metric = await Metric.findOne({
        metricId
    }).lean();

   

    if (!metric) {
        return null;
    }

    const Model = MODEL_MAP[metric.collection];
    let value = 0;

    if (Model || metric.formulaType === "ratio" || metric.formulaType === "metricPercentage") {

        switch (metric.formulaType) {

            case "count":
                const countResult = await Model.aggregate([
                    { $match: { [metric.fieldPath]: { $exists: true, $ne: [] } } },
                    { $project: { count: { $size: `$${metric.fieldPath}` } } },
                    { $group: { _id: null, total: { $sum: "$count" } } }
                ]);
                value = countResult.length > 0 ? countResult[0].total : 0;
                break;

            case "sum":
                const sumResult = await Model.aggregate([
                    { $match: { [metric.fieldPath]: { $exists: true, $ne: [] } } },
                    { $unwind: `$${metric.fieldPath}` },
                    { $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $convert: {
                                    input: {
                                        $replaceAll: {
                                            input: { $toString: { $ifNull: [`$${metric.fieldPath}.${metric.sumField}`, "0"] } },
                                            find: ",",
                                            replacement: ""
                                        }
                                    },
                                    to: "double",
                                    onError: 0,
                                    onNull: 0
                                }
                            }
                        }
                    }}
                ]);
                value = sumResult.length > 0 ? sumResult[0].total : 0;
                break;

            case "conditionalCount":
                const condResult = await Model.aggregate([
                    { $match: { [metric.fieldPath]: { $exists: true, $ne: [] } } },
                    { $unwind: `$${metric.fieldPath}` },
                    { $match: { [`${metric.fieldPath}.${metric.conditionField}`]: metric.conditionValue } },
                    { $count: "matches" }
                ]);
                value = condResult.length > 0 ? condResult[0].matches : 0;
                break;

            case "objectSum":
                const objSumResult = await Model.aggregate([
                    { $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $convert: {
                                    input: { $ifNull: [`$${metric.fieldPath}.${metric.sumField}`, 0] },
                                    to: "double",
                                    onError: 0,
                                    onNull: 0
                                }
                            }
                        }
                    }}
                ]);
                value = objSumResult.length > 0 ? objSumResult[0].total : 0;
                break;

            case "percentage":
                const totalDocs = await Model.countDocuments();
                const matchingDocs = await Model.countDocuments({
                    [metric.numeratorField]: {
                        $exists: true,
                        $ne: []
                    }
                });
                value = totalDocs === 0 ? 0 : Number((matchingDocs / totalDocs * 100).toFixed(2));
                break;
    case "ratio":

    const numeratorMetric =
        await calculateMetric(
            metric.numeratorMetric
        );

    const denominatorMetric =
        await calculateMetric(
            metric.denominatorMetric
        );

    value =
        denominatorMetric?.value > 0
            ? Number(
                (
                    numeratorMetric.value /
                    denominatorMetric.value
                ).toFixed(2)
            )
            : 0;

    break;
            case "facultyCount":
                value = await Model.countDocuments();
                break;

            case "studentCount":
                value = await Model.countDocuments();
                break;

            case "studentConditionalCount":
                value = await Model.countDocuments({
                    [metric.fieldName]: metric.fieldValue
                });
                break;

            case "studentExists":
                value = await Model.countDocuments({
                    [metric.fieldName]: {
                        $exists: true,
                        $ne: ""
                    }
                });
                break;
    case "metricPercentage":

    const numerator =
        await calculateMetric(
            metric.numeratorMetric
        );

    const denominator =
        await calculateMetric(
            metric.denominatorMetric
        );

    value =
        denominator?.value > 0
            ? Number(
                (
                    numerator.value /
                    denominator.value * 100
                ).toFixed(2)
            )
            : 0;

    break;

            default:
                value = 0;
        }
    }

    return {
        metricId: metric.metricId,
        metricName: metric.metricName,
        value
    };
}
async function getStudentProfileCompletion() {

    const students =
        await StudentProfile.find().lean();

    const results = [];

    for (const student of students) {

        let filled = 0;
        let total = 0;

        function countFields(obj) {

            for (const key in obj) {

                const value = obj[key];

                if (
                    value &&
                    typeof value === "object" &&
                    !Array.isArray(value)
                ) {

                    countFields(value);

                } else {

                    total++;

                    if (
                        value !== undefined &&
                        value !== null &&
                        value !== ""
                    ) {
                        filled++;
                    }
                }
            }
        }

        countFields(student);

        const completion =
            total > 0
                ? Number(
                    (
                        filled /
                        total * 100
                    ).toFixed(2)
                )
                : 0;

        results.push({

            student:
                student.personal_details?.fullName ||
                "Unknown",

            completion
        });
    }

    return results;
}
async function getStudentProfileSummary() {

    const profiles =
        await getStudentProfileCompletion();

    const totalStudents =
        profiles.length;

    const averageCompletion =
        totalStudents > 0
            ? Number(
                (
                    profiles.reduce(
                        (sum, p) =>
                            sum + p.completion,
                        0
                    ) / totalStudents
                ).toFixed(2)
            )
            : 0;

    const completeProfiles =
        profiles.filter(
            p => p.completion >= 80
        ).length;

    const incompleteProfiles =
        totalStudents -
        completeProfiles;

    return {
        totalStudents,
        averageCompletion,
        completeProfiles,
        incompleteProfiles
    };
}
async function getStudentDepartments() {
    const result = await StudentProfile.aggregate([
        {
            $group: {
                _id: { $ifNull: ["$academic_details.faculty", "Unknown"] },
                students: { $sum: 1 }
            }
        },
        {
            $project: {
                department: "$_id",
                students: 1,
                _id: 0
            }
        }
    ]);
    return result;
}

async function getProgramLevels() {
    const result = await StudentProfile.aggregate([
        {
            $group: {
                _id: { $ifNull: ["$academic_details.programLevel", "Unknown"] },
                students: { $sum: 1 }
            }
        },
        {
            $project: {
                programLevel: "$_id",
                students: 1,
                _id: 0
            }
        }
    ]);
    return result;
}
module.exports = {
    calculateMetric,
    getStudentProfileCompletion,
    getStudentProfileSummary,
    getStudentDepartments,
    getProgramLevels
};

