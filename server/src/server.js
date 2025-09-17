import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import leadRoutes from "./routes/leads.js";
import customerRoutes from "./routes/customers.js";
import caseRoutes from "./routes/cases.js";
import partnerRoutes from "./routes/partners.js";
import branchRoutes from "./routes/branches.js";
import dashboardRoutes from "./routes/dashboard.js";

dotenv.config();
const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
app.use(helmet());
app.use(express.json({limit:"5mb"}));
app.use(morgan("dev"));

await mongoose.connect(process.env.MONGO_URI);

app.get("/", (req,res)=>res.json({ok:true, service:"DSA CRM API"}));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use("/uploads", express.static("uploads"));

app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on :${PORT}`));
