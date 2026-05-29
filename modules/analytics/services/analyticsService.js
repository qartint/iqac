const Metric = require("../models/Metric");
const Faculty = require("../../../models/Faculty");

async function calculateMetric(metricId) {



    const metric = await Metric.findOne({
        metricId
    }).lean();

   

    if (!metric) {
        return null;
    }

    let value = 0;

    if (metric.collection === "faculties") {

        switch (metric.formulaType) {

            case "count":

                const countRecords = await Faculty.find({
                    [metric.fieldPath]: {
                        $exists: true,
                        $ne: []
                    }
                }).lean();

                value = countRecords.reduce((total, faculty) => {

                    const data = faculty[metric.fieldPath] || [];

                    return total + data.length;

                }, 0);

                break;

            case "sum":

                const sumRecords = await Faculty.find({
                    [metric.fieldPath]: {
                        $exists: true,
                        $ne: []
                    }
                }).lean();

                value = sumRecords.reduce((total, faculty) => {

                    const items = faculty[metric.fieldPath] || [];

                    const subtotal = items.reduce((sum, item) => {

                        const amount = Number(
                            String(item[metric.sumField] || 0)
                                .replace(/,/g, "")
                        );

                        return sum + amount;

                    }, 0);

                    return total + subtotal;

                }, 0);

                break;
                case "conditionalCount":

    const conditionalRecords = await Faculty.find({
        [metric.fieldPath]: {
            $exists: true,
            $ne: []
        }
    }).lean();

    value = conditionalRecords.reduce((total, faculty) => {

        const items =
            faculty[metric.fieldPath] || [];

        const matches = items.filter(item =>

            item[metric.conditionField] ===
            metric.conditionValue

        ).length;

        return total + matches;

    }, 0);

    break;
            case "objectSum":

    const records = await Faculty.find().lean();

    value = records.reduce((total, faculty) => {

        const obj = faculty[metric.fieldPath] || {};

        const amount = Number(
            obj[metric.sumField] || 0
        );

        return total + amount;

    }, 0);

    break;
    case "percentage":

    const totalFaculty =
        await Faculty.countDocuments();

    const matchingFaculty =
        await Faculty.countDocuments({
            [metric.numeratorField]: {
                $exists: true,
                $ne: []
            }
        });

    value =
        totalFaculty === 0
            ? 0
            : Number(
                (
                    matchingFaculty /
                    totalFaculty * 100
                ).toFixed(2)
            );

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

    value =
        await Faculty.countDocuments();

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

module.exports = {
    calculateMetric
};