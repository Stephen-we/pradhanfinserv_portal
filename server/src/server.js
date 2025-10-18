// server/src/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

// ---- Routes ----
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import leadRoutes from "./routes/leads.js";
import customerRoutes from "./routes/customers.js";
import caseRoutes from "./routes/cases.js";
import partnerRoutes from "./routes/partners.js";
import branchRoutes from "./routes/branches.js";
import dashboardRoutes from "./routes/dashboard.js";
import customerDocs from "./routes/customerDocs.js";
import taskRoutes from "./routes/tasks.js";
import auditRoutes from "./routes/audit.js";
import metricsRoutes from "./routes/metrics.js";

dotenv.config();
const app = express();

// ---- ES Module dirname fix ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Allowed Origins (dynamic + static fallback) ----
let allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// ✅ Add Cloudflare + local domains if not already included
const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "https://stephenweb.xyz",
  "https://api.stephenweb.xyz",
];

for (const origin of defaultOrigins) {
  if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
}

// ✅ CORS setup with logging for unauthorized domains
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        console.warn("❌ Blocked by CORS:", origin);
        cb(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  })
);

// ---- Middleware ----
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// ---- Database ----
try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");
} catch (err) {
  console.error("❌ MongoDB connection failed:", err.message);
  process.exit(1);
}

// ---- Root ----
app.get("/", (req, res) => res.json({ ok: true, service: "DSA CRM API" }));

// ---- API Routes ----
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/channel-partners", partnerRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/customer-docs", customerDocs);
app.use("/api/tasks", taskRoutes);
app.use("/api/metrics", metricsRoutes);
app.use("/api/audit", auditRoutes);

// ---- Static Uploads ----
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ---- Error Handler ----
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

// ---- Start Server ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 API running on port ${PORT}`));
