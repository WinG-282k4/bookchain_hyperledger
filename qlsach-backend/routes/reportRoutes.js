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

// POST /api/purchase  -- protected (any logged-in user)
router.post("/purchase", protect, async (req, res) => {
  const { maSach, quantity } = req.body;
  if (!maSach || !quantity)
    return res
      .status(400)
      .json({ success: false, error: "maSach and quantity required" });
  // Prevent Admins and Managers from making purchases through the API
  if (req.user && (req.user.role === "Admin" || req.user.role === "Manager")) {
    return res
      .status(403)
      .json({
        success: false,
        error: "Admins and Managers cannot perform purchases",
      });
  }
  let conn;
  try {
    if (!connectToNetwork) throw new Error("Fabric helper not available");
    conn = await connectToNetwork(
      req.user.fabricId || process.env.GUEST_FABRIC_ID
    );
    // fetch current book
    const result = await conn.contract.evaluateTransaction("querySach", maSach);
    const book = JSON.parse(result.toString());
    const current = Number(book.soLuong || 0);
    const q = Number(quantity);
    if (q <= 0)
      return res
        .status(400)
        .json({ success: false, error: "Invalid quantity" });
    if (current < q)
      return res
        .status(400)
        .json({ success: false, error: "Not enough stock" });
    const newQty = current - q;
    await conn.contract.submitTransaction(
      "updateSoLuongSach",
      maSach,
      String(newQty)
    );
    // record purchase
    const buyer =
      req.user.username || req.user.id || req.user.fabricId || "unknown";
    const entry = reportService.recordPurchase({ maSach, quantity: q, buyer });
    res.json({
      success: true,
      message: "Purchase recorded",
      data: { entry, newQty },
    });
  } catch (err) {
    console.error("purchase error", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn && conn.gateway) conn.gateway.disconnect();
  }
});

// GET /api/reports/sales?period=1h|1d|7d
router.get(
  "/reports/sales",
  protect,
  authorize("Admin", "Manager"),
  (req, res) => {
    try {
      const period = req.query.period || "1d";
      const data = reportService.getTopSellers(period, 10);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
