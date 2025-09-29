// client/src/services/api.js
import axios from "axios";
import { isTokenExpired } from "../utils/jwt";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 10000, // ✅ safety timeout
});

// ✅ Request interceptor
API.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem("token");

    // ⏰ Auto clear expired tokens before attaching
    if (token && isTokenExpired(token)) {
      console.warn("⚠️ Token expired, clearing storage...");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      token = null;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ✅ Fix: Don't set Content-Type for FormData - let browser set it automatically
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    // If it's FormData, the browser will automatically set the Content-Type with boundary
    // and removing the Content-Type header entirely lets axios handle it properly

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response interceptor with better handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;

    if (response?.status === 401) {
      console.warn("Authentication failed, redirecting to login...");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setTimeout(() => {
        window.location.replace("/login"); // 🚪 force re-login
      }, 100);
    }

    if (response?.data?.message) {
      error.message = response.data.message;
    }

    return Promise.reject(error);
  }
);

// ✅ Helper for channel partners API
export const channelPartnersAPI = {
  getAll: (params = {}) => API.get("/channel-partners", { params }),
  getById: (id) => API.get(`/channel-partners/${id}`),
  create: (data) => {
    // Handle both regular JSON data and FormData for file uploads
    if (data instanceof FormData) {
      return API.post("/channel-partners", data);
    }
    return API.post("/channel-partners", data);
  },
  update: (id, data) => {
    // Handle both regular JSON data and FormData for file uploads
    if (data instanceof FormData) {
      return API.put(`/channel-partners/${id}`, data);
    }
    return API.put(`/channel-partners/${id}`, data);
  },
  delete: (id) => API.delete(`/channel-partners/${id}`),
};

export default API;