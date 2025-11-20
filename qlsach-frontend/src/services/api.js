import axios from 'axios';

// Su dung proxy trong development de tranh CORS
const API_BASE_URL = 'http://192.168.31.60:3006/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor de log requests
api.interceptors.request.use(
  (config) => {
    console.log(`?? API Call: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('? Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor de xu ly loi
api.interceptors.response.use(
  (response) => {
    console.log(`? API Success: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('? API Error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      error.message = 'Khong the ket noi den server. Kiem tra xem API server co dang chay khong?';
    } else if (error.message.includes('Network Error')) {
      error.message = 'Loi ket noi mang. Kiem tra ket noi internet va server.';
    } else if (error.response) {
      error.message = `Server error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`;
    } else if (error.request) {
      error.message = 'Khong nhan duoc phan hoi tu server.';
    }
    
    return Promise.reject(error);
  }
);

// Test ket noi den server
const testConnection = async () => {
  try {
    const response = await api.get('/health');
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      details: 'Hay chac chan rang API server dang chay tren port 3006'
    };
  }
};

// API Service
export const sachAPI = {
  // Khoi tao du lieu
  initData: () => api.post('/init'),
  
  // Lay tat ca sach
  getAllSach: () => api.get('/sach'),
  
  // Lay sach theo ma
  getSachByMa: (maSach) => api.get(`/sach/${maSach}`),
  
  // Tao sach moi
  createSach: (data) => api.post('/sach', data),
  
  // Cap nhat sach
  updateSach: (maSach, data) => api.put(`/sach/${maSach}`, data),
  
  // Xoa sach
  deleteSach: (maSach) => api.delete(`/sach/${maSach}`),
  
  // Tim sach theo the loai
  getSachByTheLoai: (theLoai) => api.get(`/sach/theloai/${theLoai}`),
  
  // Cap nhat so luong sach
  updateSoLuongSach: (maSach, soLuongMoi) => api.patch(`/sach/${maSach}/soluong`, { soLuongMoi }),

  // Test connection
  testConnection: testConnection
};

export { testConnection };
export default api;