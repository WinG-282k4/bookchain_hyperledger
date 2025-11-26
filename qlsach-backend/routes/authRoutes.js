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

// POST /auth/request-reset
// Dev/testing: require both username and email to match, then reset password to "123456"
router.post("/request-reset", async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username || !email) {
      return res
        .status(400)
        .json({ success: false, error: "username and email are required" });
    }

    const user = findUserByUsername(username);
    if (!user || user.email !== email) {
      return res
        .status(400)
        .json({ success: false, error: "username and email do not match" });
    }

    // Immediately set password to "123456" for demo/testing
    const ok = await updatePasswordById(user.id, "123456");
    if (!ok) {
      return res
        .status(500)
        .json({ success: false, error: "Could not reset password" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Password reset to 123456" });
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
      return res
        .status(400)
        .json({
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
