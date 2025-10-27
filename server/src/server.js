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

// Trust proxy (so req.ip works correctly behind reverse proxies / Cloudflare)
app.set("trust proxy", true);

// ✅ CORS with logging for unauthorized domains
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

// ---------------- MongoDB Connection (retrying, short timeouts) ----------------
const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/pradhanfinserv";

// Mask credentials in logs
const maskedUri = (mongoUri || "").replace(/\/\/([^:]+):([^@]+)@/, "//<user>:<pass>@");
console.log("🔎 Using Mongo URI:", maskedUri);

async function connectWithRetry({
  uri = mongoUri,
  maxRetries = 8,
  initialDelayMs = 1000,
} = {}) {
  if (!uri) {
    console.error("❌ No Mongo URI provided. Set MONGODB_URI or MONGO_URI in server/.env");
    process.exit(1);
  }

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        socketTimeoutMS: 20000,
        maxPoolSize: 10,
      });
      console.log("✅ MongoDB connected");
      return;
    } catch (err) {
      attempt += 1;
      console.error(`⚠️ Mongo connect attempt ${attempt} failed: ${err.message}`);
      if (attempt >= maxRetries) {
        console.error("❌ Giving up after maximum retries.");
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 1.8, 10000);
    }
  }
}

mongoose.connection.on("error", (e) => console.error("❌ Mongo error:", e));
mongoose.connection.on("disconnected", () => console.warn("⚠️ Mongo disconnected"));

// ---- Root & Health ----
app.get("/", (req, res) => res.json({ ok: true, service: "DSA CRM API" }));
app.get("/health", (req, res) => {
  const state = mongoose.connection.readyState; // 0=disconnected 1=connected 2=connecting 3=disconnecting
  res.status(state === 1 ? 200 : 503).json({ ok: state === 1, state });
});

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
  console.error("❌ Error:", err.stack || err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

// ---- Start Server AFTER Mongo connects ----
const PORT = process.env.PORT || 5000;

await connectWithRetry();
app.listen(PORT, () => console.log(`🚀 API running on port ${PORT}`));
