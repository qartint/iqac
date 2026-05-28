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