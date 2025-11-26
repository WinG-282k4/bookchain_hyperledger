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

    // POST /auth/request-reset
    router.post("/request-reset", (req, res) => {
      try {
        const { email } = req.body;
        if (!email) {
          return res
            .status(400)
            .json({ success: false, error: "Email is required" });
        }

        const user = findUserByEmail(email);
        if (!user) {
          // For security, do not reveal whether email exists
          return res
            .status(200)
            .json({
              success: true,
              message: "If the email exists, a reset token was generated",
            });
        }

        const crypto = require("crypto");
        const resetToken = crypto.randomBytes(20).toString("hex");
        const expiry = Date.now() + 60 * 60 * 1000; // 1 hour

        setResetToken(user.id, resetToken, expiry);

        // NOTE: In production send email to the user with the resetToken link.
        // For demo/testing, we return the token in response.
        return res.status(200).json({
          success: true,
          message:
            "Reset token generated (for demo purposes token returned in response)",
          resetToken,
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
            .json({
              success: false,
              error: "Token and newPassword are required",
            });
        }

        const user = findUserByResetToken(token);
        if (!user) {
          return res
            .status(400)
            .json({ success: false, error: "Invalid or expired token" });
        }

        if (!user.resetTokenExpiry || Date.now() > user.resetTokenExpiry) {
          return res
            .status(400)
            .json({ success: false, error: "Token expired" });
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
    res
      .status(500)
      .json({ success: false, error: "Loi server noi bo: " + error.message });
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

module.exports = router;
