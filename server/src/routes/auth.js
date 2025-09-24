import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js"; // ✅ import middleware

const router = express.Router();

const sign = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "dev",
    { expiresIn: "12h" }
  );

// === REGISTER (public signup for now) ===
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role = "officer" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    // ✅ Do not hash here — pre("save") in model handles it
    const user = await User.create({ name, email, password, role });

    return res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
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

    if (!user.isActive) {
      return res.status(403).json({ message: "Account disabled" });
    }

    const token = sign(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});

// === GET CURRENT USER (requires token) ===
router.get("/me", auth, async (req, res, next) => {
  try {
    // req.user is already set in middleware (auth.js)
    res.json(req.user);
  } catch (e) {
    next(e);
  }
});

export default router;
