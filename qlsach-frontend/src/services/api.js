import axios from "axios";

// Cau hinh URL co so API
// Trong moi truong development, se dung proxy (neu duoc cau hinh trong package.json)
// Trong moi truong production, su dung dia chi backend
const API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "/api"
    : "http://192.168.31.60:3006/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Auth client: goi /auth/* (khong bi prefix /api)
const AUTH_BASE_URL = "http://192.168.31.60:3006";

const authClient = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Interceptor cho authClient de logging
authClient.interceptors.request.use(
  (config) => {
    console.log(
      `-> Auth Request: ${config.method?.toUpperCase()} ${config.baseURL}${
        config.url
      }`
    );
    // attach token from localStorage if present
    try {
      const user = localStorage.getItem("user");
      const token = user ? JSON.parse(user).token : null;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      // ignore
    }
    return config;
  },
  (error) => {
    console.error("Auth request error:", error);
    return Promise.reject(error);
  }
);

authClient.interceptors.response.use(
  (response) => {
    console.log(`<-- Auth Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(
      "Auth response error:",
      error.response || error.message || error
    );
    return Promise.reject(error);
  }
);

// ===============================================
// 1. INTERCEPTOR - GAN TOKEN CHO MOI REQUEST NGHIEP VU
// ===============================================
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem("user");
    const token = user ? JSON.parse(user).token : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`--> API Call: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// ===============================================
// 2. INTERCEPTOR - XU LY LOI PHAN HOI
// ===============================================
api.interceptors.response.use(
  (response) => {
    console.log(`<- API Success: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("API Error:", error);
    let message = "Loi ket noi server.";

    if (error.response) {
      const status = error.response.status;
      const errorMsg = error.response.data?.error || error.response.statusText;

      if (status === 401 || status === 403) {
        message = `Truy cap bi tu choi (${status}). Vui long dang nhap lai hoac kiem tra quyen.`;
      } else if (status === 400) {
        message = `Yeu cau khong hop le: ${errorMsg}`;
      } else {
        message = `Server error: ${status} - ${errorMsg}`;
      }
    } else if (error.request) {
      message =
        "Khong nhan duoc phan hoi tu server. Kiem tra ket noi hoac API server.";
    }

    error.message = message;
    return Promise.reject(error);
  }
);

// ===============================================
// 3. API DICH VU XAC THUC (AUTH API)
// ===============================================
export const authAPI = {
  // Goi endpoint /auth/login (Khong can Token)
  login: (username, password) =>
    authClient.post("/auth/login", { username, password }),
  // Goi endpoint /auth/register (Khong can Token)
  register: (data) => authClient.post("/auth/register", data),
  // Request password reset (provide username and email)
  requestReset: (username, email) =>
    authClient.post("/auth/request-reset", { username, email }),
  // Reset password with token
  resetPassword: (token, newPassword) =>
    authClient.post("/auth/reset", { token, newPassword }),
  // Profile endpoints (require Authorization)
  getProfile: () => authClient.get("/auth/me"),
  updateProfile: (data) => authClient.put("/auth/me", data),
  changePassword: (oldPassword, newPassword) =>
    authClient.post("/auth/change-password", { oldPassword, newPassword }),
  // Admin-only: create manager account
  createManager: (data) => authClient.post("/auth/create-manager", data),
};

// ===============================================
// 4. API DICH VU NGHIEP VU (SACH API)
// ===============================================
export const sachAPI = {
  initData: () => api.post("/init"),
  getAllSach: () => api.get("/sach"),
  getSachByMa: (maSach) => api.get(`/sach/${maSach}`),
  createSach: (data) => api.post("/sach", data),
  updateSach: (maSach, data) => api.put(`/sach/${maSach}`, data),
  deleteSach: (maSach) => api.delete(`/sach/${maSach}`),
  getSachByTheLoai: (theLoai) => api.get(`/sach/theloai/${theLoai}`),
  updateSoLuongSach: (maSach, soLuongMoi) =>
    api.patch(`/sach/${maSach}/soluong`, { soLuongMoi }),
  // Buy using the user-specific chaincode method (submits transaction with user's identity)
  buySach: (maSach, quantity) =>
    api.post("/sach/buy", { maSach, soLuong: quantity }),
  getMyBooks: () => api.get("/my-books"),
  getHistory: (maSach) => api.get(`/sach/${maSach}/history`),
};

// Sales APIs
export const salesAPI = {
  getTopSellers: (period) => api.get(`/reports/sales?period=${period}`),
  // Top by transaction counts
  getTopTransactions: (limit = 10) =>
    api.get(`/reports/transactions?limit=${limit}`),
};

export default api;
