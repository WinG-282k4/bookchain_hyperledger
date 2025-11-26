// qlsach-frontend/src/context/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from "react";
import { authAPI } from "../services/api"; // Import authAPI

const AuthContext = createContext();

// Ham lay trang thai user tu LocalStorage
const getInitialUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getInitialUser);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Luu user vao LocalStorage moi khi state thay doi
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // Ham Login
  const login = async (username, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await authAPI.login(username, password);
      if (response.data && response.data.success) {
        const userData = response.data.data;
        setUser(userData); // { username, role, fabricId, token }
        return true;
      }
    } catch (error) {
      const message = error.response?.data?.error || "Dang nhap that bai.";
      setAuthError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Ham Logout
  const logout = () => {
    setUser(null);
  };

  // Continue as guest (no authentication)
  const continueAsGuest = () => {
    const guest = { username: "Guest", role: "Guest", token: null };
    setUser(guest);
  };

  // Kiem tra quyen: requiredRoles la mang, vi du: ['Admin', 'Manager']
  const isAuthorized = (requiredRoles) => {
    // Neu khong co yeu cau quyen co the, luon tra ve true (nhu Guest)
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (!user) return false;

    return requiredRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthorized,
        loading,
        authError,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
