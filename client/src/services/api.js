import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api", // ✅ proxy handles localhost
});

// ✅ Attach token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Handle expired/invalid token globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized — maybe token expired, logging out...");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login"; // 👈 auto-redirect
    }
    return Promise.reject(error);
  }
);

export default API;
