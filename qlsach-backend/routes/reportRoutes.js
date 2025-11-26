const express = require("express");
const router = express.Router();
const path = require("path");

const reportService = require("../services/reportService");
const { protect, authorize } = require("../middleware/authMiddleware");

// helper to get fabric connection from server's connectToNetwork (reuse code)
const { connectToNetwork } = require("../utils/fabricHelper") || {};

// GET /api/dashboard/metrics?period=daily
router.get("/dashboard/metrics", async (req, res) => {
  let conn;
  try {
    // attempt guest connection using server's exported helper
    if (!connectToNetwork) throw new Error("Fabric helper not available");
    conn = await connectToNetwork(process.env.GUEST_FABRIC_ID || "sv102220126");
    const data = await reportService.getMetrics(conn, {
      period: req.query.period || "daily",
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("dashboard metrics error", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn && conn.gateway) conn.gateway.disconnect();
  }
});

// POST /api/reports/generate  -- protected
router.post(
  "/reports/generate",
  protect,
  authorize("Admin", "Manager"),
  async (req, res) => {
    let conn;
    try {
      if (!connectToNetwork) throw new Error("Fabric helper not available");
      conn = await connectToNetwork(
        req.user.fabricId || process.env.GUEST_FABRIC_ID
      );
      const { type, format, period, from, to } = req.body || {};
      const entry = await reportService.generateReport(conn, {
        type,
        format,
        period,
        from,
        to,
      });
      res.json({
        success: true,
        data: entry,
        downloadUrl: `/api/reports/${entry.id}/download`,
      });
    } catch (err) {
      console.error("generate report error", err);
      res.status(500).json({ success: false, error: err.message });
    } finally {
      if (conn && conn.gateway) conn.gateway.disconnect();
    }
  }
);

// GET /api/reports  -- list reports (protected)
router.get("/reports", protect, authorize("Admin", "Manager"), (req, res) => {
  try {
    const list = reportService.listReports();
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/:id/download  -- protected
router.get(
  "/reports/:id/download",
  protect,
  authorize("Admin", "Manager"),
  (req, res) => {
    try {
      const id = req.params.id;
      const filePath = reportService.getReportFilePath(id);
      if (!filePath)
        return res
          .status(404)
          .json({ success: false, error: "Report not found" });
      res.download(filePath);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
