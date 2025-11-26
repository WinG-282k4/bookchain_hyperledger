// qlsach-backend/utils/userUtils.js

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const USER_DB_PATH = path.join(__dirname, "..", "users.json");

const readUsers = () => {
  try {
    const data = fs.readFileSync(USER_DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      writeUsers([]);
      return [];
    }
    console.error("Error reading user DB:", error.message);
    return [];
  }
};

const writeUsers = (users) => {
  try {
    fs.writeFileSync(USER_DB_PATH, JSON.stringify(users, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing user DB:", error.message);
  }
};

const findUserByUsername = (username) => {
  const users = readUsers();
  return users.find((user) => user.username === username);
};

const findUserByEmail = (email) => {
  if (!email) return null;
  const users = readUsers();
  return users.find(
    (user) => user.email && user.email.toLowerCase() === email.toLowerCase()
  );
};

const findUserById = (id) => {
  const users = readUsers();
  return users.find((user) => user.id === id);
};

const createUser = async (userData) => {
  const users = readUsers();

  const id = Date.now().toString();
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const newUser = {
    id,
    username: userData.username.toLowerCase().trim(),
    password: hashedPassword,
    role: userData.role || "User",
    fullName: userData.fullName || "",
    fabricId: userData.fabricId, // <-- fabricId
    email: userData.email || "",
  };

  users.push(newUser);
  writeUsers(users);

  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

const matchPassword = async (enteredPassword, hashedPassword) => {
  return await bcrypt.compare(enteredPassword, hashedPassword);
};

const setResetToken = (userId, token, expiry) => {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return false;
  users[idx].resetToken = token;
  users[idx].resetTokenExpiry = expiry;
  writeUsers(users);
  return true;
};

const findUserByResetToken = (token) => {
  if (!token) return null;
  const users = readUsers();
  return users.find((u) => u.resetToken === token);
};

const updatePasswordById = async (userId, newPassword) => {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return false;
  const hashed = await bcrypt.hash(newPassword, 10);
  users[idx].password = hashed;
  delete users[idx].resetToken;
  delete users[idx].resetTokenExpiry;
  writeUsers(users);
  return true;
};

module.exports = {
  findUserByUsername,
  findUserById,
  findUserByEmail,
  createUser,
  matchPassword,
  readUsers,
  setResetToken,
  findUserByResetToken,
  updatePasswordById,
};
