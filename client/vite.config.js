import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,       // try port 5173 first
    strictPort: true, // ✅ do NOT auto-switch, throw error if busy
    host: true,       // ✅ Allow external connections (needed for Cloudflare)
    allowedHosts: ["stephenweb.xyz", "api.stephenweb.xyz"], // ✅ Whitelist Cloudflare domains
    proxy: {
      "/api": {
        target: "http://localhost:5000", // backend API
        changeOrigin: true,
      },
    },
  },
});
