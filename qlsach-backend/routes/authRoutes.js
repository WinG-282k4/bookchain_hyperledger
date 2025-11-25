// qlsach-backend/routes/authRoutes.js
const express = require("express");
const jwt = require("jsonwebtoken");
const {
  findUserByUsername,
  createUser,
  matchPassword,
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
    const { username, password, fullName, fabricId, role } = req.body;

    if (!username || !password || !fabricId) {
      return res
        .status(400)
        .json({
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
    });
    const token = generateToken(user.id, user.role, user.fabricId);

    res.status(201).json({
      success: true,
      message: "Dang ky thanh cong",
      data: {
        username: user.username,
        role: user.role,
        fabricId: user.fabricId,
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
      res
        .status(401)
        .json({
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
