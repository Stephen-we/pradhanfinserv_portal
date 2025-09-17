import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { auth, allowRoles } from "../middleware/auth.js";

const router = express.Router();

const sign = (u) =>
  jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET || "dev", {
    expiresIn: "12h",
  });

// === ADMIN CREATE USER ===
router.post("/admin/create", auth, allowRoles(["admin"]), async (req, res, next) => {
  try {
    const { name, email, password, role = "viewer" } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Missing fields" });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const u = await User.create({ name, email, password: hashed, role });
    return res
      .status(201)
      .json({ id: u._id, name: u.name, email: u.email, role: u.role });
  } catch (e) {
    next(e);
  }
});

// === TEMPORARY PUBLIC SIGNUP ===
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role = "officer" } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Missing fields" });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const u = await User.create({ name, email, password: hashed, role });
    return res
      .status(201)
      .json({ id: u._id, name: u.name, email: u.email, role: u.role });
  } catch (e) {
    next(e);
  }
});

// === LOGIN ===
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    if (!user.isActive) return res.status(403).json({ message: "Account disabled" });

    const token = sign(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
