// qlsach-backend/routes/authRoutes.js
const express = require("express");
const jwt = require("jsonwebtoken");
const {
  findUserByUsername,
  findUserByEmail,
  createUser,
  matchPassword,
  setResetToken,
  findUserByResetToken,
  updatePasswordById,
  findUserById,
  updateProfileById,
} = require("../utils/userUtils");

const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");

// Ham tao JWT Token
const generateToken = (id, role, fabricId) => {
  return jwt.sign({ id, role, fabricId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, password, fullName, fabricId, role, email } = req.body;

    if (!username || !password || !fabricId) {
      return res.status(400).json({
        success: false,
        error: "Thieu username, password hoac fabricId (ID Fabric)",
      });
    }

    const userExists = findUserByUsername(username);
    if (userExists) {
      return res
        .status(400)
        .json({ success: false, error: "Ten dang nhap da ton tai" });
    }

    const user = await createUser({
      username,
      password,
      fullName,
      fabricId,
      role,
      email,
    });
    const token = generateToken(user.id, user.role, user.fabricId);

    res.status(201).json({
      success: true,
      message: "Dang ky thanh cong",
      data: {
        username: user.username,
        role: user.role,
        fabricId: user.fabricId,
        email: user.email,
        token,
      },
    });
  } catch (error) {
    console.error("Loi dang ky:", error);
    res
      .status(500)
      .json({ success: false, error: "Loi server noi bo: " + error.message });
  }
});

// POST /auth/create-manager - Admin only
router.post(
  "/create-manager",
  protect,
  authorize("Admin"),
  async (req, res) => {
    try {
      const { username, password, fullName, fabricId, email } = req.body;
      if (!username || !password || !fabricId)
        return res.status(400).json({
          success: false,
          error: "username, password and fabricId required",
        });
      const userExists = findUserByUsername(username);
      if (userExists)
        return res
          .status(400)
          .json({ success: false, error: "Username already exists" });
      const user = await createUser({
        username,
        password,
        fullName,
        fabricId,
        role: "Manager",
        email,
      });
      return res.status(201).json({
        success: true,
        message: "Manager account created",
        data: {
          username: user.username,
          role: user.role,
          fabricId: user.fabricId,
        },
      });
    } catch (err) {
      console.error("create-manager error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /auth/request-reset
// Production: create a reset token, save it (with expiry), and send email with link
router.post("/request-reset", async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username || !email) {
      return res
        .status(400)
        .json({ success: false, error: "username and email are required" });
    }

    const user = findUserByUsername(username);
    if (!user || (user.email || "") !== email) {
      return res
        .status(400)
        .json({ success: false, error: "username and email do not match" });
    }

    // generate secure token
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 60 * 60 * 1000; // 1 hour

    const saved = setResetToken(user.id, token, expiry);
    if (!saved) {
      return res
        .status(500)
        .json({ success: false, error: "Could not create reset token" });
    }

    // Construct reset URL (frontend should handle /reset?token=...)
    // Default to VM frontend address instead of localhost so links work from other hosts
    let frontendBaseRaw =
      process.env.FRONTEND_URL || "http://192.168.31.60:8006";
    // If FRONTEND_URL was left as localhost (common dev mistake) and the server
    // runs on a VM, replace localhost/127.0.0.1 with the VM IP so emails are clickable
    if (/localhost|127\.0\.0\.1/.test(frontendBaseRaw)) {
      console.warn(
        "FRONTEND_URL appears to be localhost — replacing with VM IP for email links"
      );
      frontendBaseRaw = frontendBaseRaw.replace(
        /localhost(:\d+)?|127\.0\.0\.1(:\d+)?/,
        "192.168.31.60:8006"
      );
    }
    const resetUrl = `${frontendBaseRaw.replace(
      /\/$/,
      ""
    )}/reset?token=${token}`;

    // send email
    try {
      const { sendResetEmail } = require("../utils/emailHelper");
      await sendResetEmail({
        to: user.email,
        username: user.username,
        resetUrl,
      });
    } catch (emailErr) {
      console.error("Failed to send reset email:", emailErr);
      // still return success to avoid user enumeration, but log the error
      return res.status(200).json({
        success: true,
        message:
          "If the email is valid, you will receive a reset link shortly. (email send failed in server)",
      });
    }

    return res.status(200).json({
      success: true,
      message: "If the email is valid, you will receive a reset link shortly.",
    });
  } catch (error) {
    console.error("Error request-reset:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /auth/reset
router.post("/reset", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ success: false, error: "Token and newPassword are required" });
    }

    const user = findUserByResetToken(token);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or expired token" });
    }

    if (!user.resetTokenExpiry || Date.now() > user.resetTokenExpiry) {
      return res.status(400).json({ success: false, error: "Token expired" });
    }

    const ok = await updatePasswordById(user.id, newPassword);
    if (!ok) {
      return res
        .status(500)
        .json({ success: false, error: "Could not update password" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Password has been reset" });
  } catch (error) {
    console.error("Error reset:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = findUserByUsername(username);

    if (user && (await matchPassword(password, user.password))) {
      const token = generateToken(user.id, user.role, user.fabricId);

      res.status(200).json({
        success: true,
        message: "Dang nhap thanh cong",
        data: {
          username: user.username,
          role: user.role,
          fabricId: user.fabricId,
          token,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        error: "Ten dang nhap hoac mat khau khong dung",
      });
    }
  } catch (error) {
    console.error("Loi dang nhap:", error);
    res.status(500).json({ success: false, error: "Loi server noi bo" });
  }
});

// GET /auth/me - return current user profile (requires Bearer token)
router.get("/me", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ success: false, error: "No token" });
    const token = authHeader.split(" ")[1];
    if (!token)
      return res.status(401).json({ success: false, error: "Invalid token" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const user = findUserById(payload.id);
    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    const { password, resetToken, resetTokenExpiry, ...safe } = user;
    return res.status(200).json({ success: true, data: safe });
  } catch (error) {
    console.error("Error /auth/me:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /auth/me - update profile (requires Bearer token)
router.put("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ success: false, error: "No token" });
    const token = authHeader.split(" ")[1];
    if (!token)
      return res.status(401).json({ success: false, error: "Invalid token" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const user = findUserById(payload.id);
    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    const { username, email, fullName, sdt } = req.body;

    // Update profile fields (do NOT update password here)
    const updated = {};
    if (username) updated.username = username;
    if (email) updated.email = email;
    if (fullName) updated.fullName = fullName;
    if (sdt) updated.sdt = sdt;

    const ok = updateProfileById(user.id, updated);
    if (!ok)
      return res
        .status(500)
        .json({ success: false, error: "Could not update profile" });

    const fresh = findUserById(user.id);
    const { password: pwd, resetToken, resetTokenExpiry, ...safe } = fresh;
    return res.status(200).json({ success: true, data: safe });
  } catch (error) {
    console.error("Error PUT /auth/me:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /auth/change-password - require oldPassword + newPassword, token required
router.post("/change-password", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ success: false, error: "No token" });
    const token = authHeader.split(" ")[1];
    if (!token)
      return res.status(401).json({ success: false, error: "Invalid token" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const user = findUserById(payload.id);
    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "oldPassword and newPassword are required",
      });
    }

    // verify old password
    const okMatch = await matchPassword(oldPassword, user.password);
    if (!okMatch)
      return res
        .status(400)
        .json({ success: false, error: "Old password is incorrect" });

    const ok = await updatePasswordById(user.id, newPassword);
    if (!ok)
      return res
        .status(500)
        .json({ success: false, error: "Could not update password" });

    return res.status(200).json({ success: true, message: "Password changed" });
  } catch (error) {
    console.error("Error POST /auth/change-password:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
