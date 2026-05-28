const express = require("express");
const Metric = require("../modules/analytics/models/Metric");
const Faculty = require("../models/Faculty");
const {
    calculateMetric
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

        const coverage = [];

        for (const metric of metrics) {

            let recordsFound = 0;

            if (metric.collection === "faculties") {

                recordsFound = await Faculty.countDocuments({
                    [metric.fieldPath]: {
                        $exists: true,
                        $ne: []
                    }
                });

            }

            coverage.push({
                metricId: metric.metricId,
                metricName: metric.metricName,
                recordsFound,
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

        const dashboard = [];

for (const metric of metrics) {

    const result = await calculateMetric(
        metric.metricId
    );

    dashboard.push(result);

}

res.json(dashboard);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: error.message
        });

    }

});
module.exports = router;
