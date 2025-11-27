// qlsach-backend/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { Wallets, Gateway } = require("fabric-network");
const path = require("path");
const fs = require("fs");

// Import Middleware va Routes moi
const { protect, authorize } = require("./middleware/authMiddleware");
const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
const PORT = process.env.PORT || 3006;

// --- MIDDLEWARE & CONFIGURATION ---
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ccpPath = path.resolve(
  "/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json"
);
const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

// GUEST FABRIC ID: ID mac dinh duoc su dung cho truy van khi khong co Token.
// Dam bao ID nay (vi du: 'sv102220126') da duoc dang ky trong wallet.
const GUEST_FABRIC_ID = "sv102220126";

// --- HAM KET NOI MANG FABRIC ---
async function connectToNetwork(fabricId) {
  try {
    const walletPath = path.join(process.cwd(), "wallet");
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identity = await wallet.get(fabricId);
    if (!identity) {
      throw new Error(
        `User identity ${fabricId} not found in wallet. Run registerUser.js!`
      );
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: fabricId,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork("mychannel");
    const contract = network.getContract("qlsach");

    return { gateway, contract };
  } catch (error) {
    console.error(`Failed to connect to network: ${error}`);
    throw error;
  }
}

// --- 5. ROUTES CHINH ---

// 1. Route dang ky/dang nhap (Khong can bao ve)
app.use("/auth", authRoutes);

// report/dashboard endpoints (some protected)
app.use("/api", reportRoutes);

// BO DUNG: app.use('/api', protect);
// Ap dung bao ve rieng cho cac route ben duoi

// Ham lay fabricId (Guest hoac tu Token)
const getFabricId = (req) => {
  // Neu req.user ton tai (nghia la da qua protect/auth thanh cong), dung fabricId tu token
  if (req.user && req.user.fabricId) {
    return req.user.fabricId;
  }
  // Neu khong co Token (Guest), dung ID mac dinh
  return GUEST_FABRIC_ID;
};

// -------------------------------------------------------------
// === API TRUY VAN (GUEST/USER - KHONG CAN TOKEN) ===
// -------------------------------------------------------------

// 2. Lay tat ca sach
app.get("/api/sach", async (req, res) => {
  let conn;
  try {
    // Lay ID Fabric: Mac dinh la Guest ID. Neu co Token, van hoat dong.
    const fabricId = getFabricId(req);

    conn = await connectToNetwork(fabricId);
    const result = await conn.contract.evaluateTransaction("queryAllSach");

    const sachs = JSON.parse(result.toString());
    res.status(200).json({ success: true, data: sachs });
  } catch (error) {
    console.error(`Failed to query all books: ${error}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (conn && conn.gateway) conn.gateway.disconnect();
  }
});

// 3. Lay sach theo ma
app.get("/api/sach/:maSach", async (req, res) => {
  let conn;
  try {
    const maSach = req.params.maSach;
    const fabricId = getFabricId(req);

    conn = await connectToNetwork(fabricId);
    const result = await conn.contract.evaluateTransaction("querySach", maSach);

    const sach = JSON.parse(result.toString());
    res.status(200).json({ success: true, data: sach });
  } catch (error) {
    console.error(`Failed to query book: ${error}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (conn && conn.gateway) conn.gateway.disconnect();
  }
});

// 7. Tim sach theo the loai
app.get("/api/sach/theloai/:theLoai", async (req, res) => {
  let conn;
  try {
    const theLoai = req.params.theLoai;
    const fabricId = getFabricId(req);

    conn = await connectToNetwork(fabricId);
    const result = await conn.contract.evaluateTransaction(
      "querySachByTheLoai",
      theLoai
    );

    const sachs = JSON.parse(result.toString());
    res.status(200).json({ success: true, data: sachs });
  } catch (error) {
    console.error(`Failed to query books by category: ${error}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (conn && conn.gateway) conn.gateway.disconnect();
  }
});

// -------------------------------------------------------------
// === API THAO TAC GHI (ADMIN/MANAGER - CAN TOKEN) ===
// -------------------------------------------------------------

// Ap dung protect va authorize cho tung route ghi
// Ly do: cac middleware nay se set req.user.fabricId khi Token hop le
const adminManagerAuth = [protect, authorize("Admin", "Manager")];

// 4. Tao sach moi
app.post("/api/sach", adminManagerAuth, async (req, res) => {
  let conn;
  try {
    const { maSach, tenSach, theLoai, tacGia, namXuatBan, soLuong } = req.body;
    if (!maSach || !tenSach || !theLoai || !tacGia || !namXuatBan || !soLuong) {
      return res
        .status(400)
        .json({ success: false, error: "Thieu thong tin bat buoc" });
    }
    // req.user.fabricId duoc set boi middleware 'protect'
    conn = await connectToNetwork(req.user.fabricId);
    await conn.contract.submitTransaction(
      "createSach",
      maSach,
      tenSach,
      theLoai,
      tacGia,
      namXuatBan,
      soLuong.toString()
    );

    res.status(201).json({
      success: true,
      message: `Da tao sach ${maSach} thanh cong`,
      data: { maSach, tenSach, theLoai, tacGia, namXuatBan, soLuong },
    });
  } catch (error) {
    console.error(`Failed to create book: ${error}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (conn && conn.gateway) conn.gateway.disconnect();
  }
});

// 5. Cap nhat sach
app.put("/api/sach/:maSach", adminManagerAuth, async (req, res) => {
  let conn;
  try {
    const maSach = req.params.maSach;
    const { tenSach, theLoai, tacGia, namXuatBan, soLuong } = req.body;
    if (!tenSach || !theLoai || !tacGia || !namXuatBan || !soLuong) {
      return res
        .status(400)
        .json({ success: false, error: "Thieu thong tin bat buoc" });
    }
    conn = await connectToNetwork(req.user.fabricId);
    await conn.contract.submitTransaction(
      "updateSach",
      maSach,
      tenSach,
      theLoai,
      tacGia,
      namXuatBan,
      soLuong.toString()
    );
    res.status(200).json({
      success: true,
      message: `Da cap nhat sach ${maSach} thanh cong`,
      data: { maSach, tenSach, theLoai, tacGia, namXuatBan, soLuong },
    });
  } catch (error) {
    console.error(`Failed to update book: ${error}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (conn && conn.gateway) conn.gateway.disconnect();
  }
});

// 8. Cap nhat so luong sach
app.patch("/api/sach/:maSach/soluong", adminManagerAuth, async (req, res) => {
  let conn;
  try {
    const maSach = req.params.maSach;
    const { soLuongMoi } = req.body;
    if (!soLuongMoi) {
      return res
        .status(400)
        .json({ success: false, error: "Thieu thong tin so luong moi" });
    }
    conn = await connectToNetwork(req.user.fabricId);
    await conn.contract.submitTransaction(
      "updateSoLuongSach",
      maSach,
      soLuongMoi.toString()
    );
    res.status(200).json({
      success: true,
      message: `Da cap nhat so luong sach ${maSach} thanh ${soLuongMoi} thanh cong`,
    });
  } catch (error) {
    console.error(`Failed to update book quantity: ${error}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (conn && conn.gateway) conn.gateway.disconnect();
  }
});

// 6. Xoa sach
app.delete("/api/sach/:maSach", adminManagerAuth, async (req, res) => {
  let conn;
  try {
    const maSach = req.params.maSach;
    conn = await connectToNetwork(req.user.fabricId);
    await conn.contract.submitTransaction("deleteSach", maSach);

    res
      .status(200)
      .json({ success: true, message: `Da xoa sach ${maSach} thanh cong` });
  } catch (error) {
    console.error(`Failed to delete book: ${error}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (conn && conn.gateway) conn.gateway.disconnect();
  }
});

// 1. Khoi tao du lieu (Chi Admin/Manager duoc phep)
app.post("/api/init", adminManagerAuth, async (req, res) => {
  let conn;
  try {
    conn = await connectToNetwork(req.user.fabricId);
    await conn.contract.submitTransaction("initLedger");
    await conn.gateway.disconnect();

    res
      .status(200)
      .json({ success: true, message: "Da khoi tao du lieu sach thanh cong" });
  } catch (error) {
    console.error(`Failed to initialize ledger: ${error}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (conn && conn.gateway) conn.gateway.disconnect();
  }
});

// Health check (Khong can xac thuc)
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "QLSach API Server is running",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ success: false, error: "Endpoint not found" });
});

// Error handler
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ success: false, error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`+ QLSach API Server running on port ${PORT}`);
  console.log(`+ Auth Endpoints: http://localhost:${PORT}/auth`);
  console.log(
    `+ Guest/User Queries: http://localhost:${PORT}/api/sach (TOKEN OPTIONAL)`
  );
  console.log(
    `+ Admin/Manager Operations: http://localhost:${PORT}/api/... (TOKEN REQUIRED)`
  );
  console.log(
    `\n*** User data is stored in users.json (using fabricId for Hyperledger identity) ***\n`
  );
});

// start scheduled report jobs (optional - requires node-cron installed)
try {
  require("./jobs/reportCron");
} catch (e) {
  console.log(
    "Report cron not started (missing dependency or file):",
    e.message
  );
}
