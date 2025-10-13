// server/src/routes/users.js
import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { logAction } from "../middleware/audit.js";
import { requireOwnerOtp } from "../middleware/requireOwnerOtp.js";

const router = express.Router();
const DEV_EMAIL = "stephen@gmail.com"; // 🔒 Developer protected account

// 🧩 Helper to block modification of developer account
function protectDevAccount(target, res) {
  if (target.email === DEV_EMAIL) {
    return res.status(403).json({ message: "Developer account cannot be modified or deleted." });
  }
  return null;
}

// ✅ Create user (Admin / Superadmin + OTP)
router.post("/", auth, allowRoles(["admin", "superadmin"]), requireOwnerOtp("purpose"), async (req, res, next) => {
  try {
    const { name, email, password, role = "officer" } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email, and password are required." });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const user = new User({ name, email, password, role });
    await user.save();

    await logAction({
      req,
      action: "create_user",
      entityType: "User",
      entityId: user._id,
      meta: { email: user.email, role: user.role }
    });

    res.status(201).json({ ok: true, id: user._id });
  } catch (e) {
    next(e);
  }
});

// ✅ Get all users (Admin / Superadmin)
router.get("/", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (e) {
    next(e);
  }
});

// ✅ Update role (Admin / Superadmin)
router.patch("/:id/role", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
  try {
    const { role } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (protectDevAccount(target, res)) return;

    target.role = role;
    await target.save();

    await logAction({
      req,
      action: "update_user_role",
      entityType: "User",
      entityId: target._id,
      meta: { email: target.email, newRole: target.role }
    });

    res.json({
      _id: target._id,
      name: target.name,
      email: target.email,
      role: target.role,
      isActive: target.isActive
    });
  } catch (e) {
    next(e);
  }
});

// ✅ Toggle active (Admin / Superadmin)
router.patch("/:id/active", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (protectDevAccount(target, res)) return;

    target.isActive = !!isActive;
    await target.save();

    await logAction({
      req,
      action: "toggle_user_active",
      entityType: "User",
      entityId: target._id,
      meta: { email: target.email, isActive: target.isActive }
    });

    res.json({
      _id: target._id,
      name: target.name,
      email: target.email,
      role: target.role,
      isActive: target.isActive
    });
  } catch (e) {
    next(e);
  }
});

// ✅ Reset password (Admin / Superadmin)
router.patch("/:id/password", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
  try {
    const { password } = req.body;
    const target = await User.findById(req.params.id).select("+password");
    if (!target) return res.status(404).json({ message: "User not found" });
    if (protectDevAccount(target, res)) return;

    target.password = password; // pre-save hook will hash
    await target.save();

    await logAction({
      req,
      action: "reset_user_password_by_admin",
      entityType: "User",
      entityId: target._id,
      meta: { email: target.email }
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ✅ Edit user (name/email) (Admin / Superadmin)
router.patch("/:id", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (protectDevAccount(target, res)) return;

    if (name !== undefined) target.name = name;
    if (email !== undefined) target.email = email;
    await target.save();

    await logAction({
      req,
      action: "update_user",
      entityType: "User",
      entityId: target._id,
      meta: { email: target.email }
    });

    res.json({
      _id: target._id,
      name: target.name,
      email: target.email,
      role: target.role,
      isActive: target.isActive
    });
  } catch (e) {
    next(e);
  }
});

// ✅ Delete user (Admin / Superadmin + OTP)
router.delete("/:id", auth, allowRoles(["admin", "superadmin"]), requireOwnerOtp("purpose"), async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (protectDevAccount(target, res)) return;

    await User.findByIdAndDelete(req.params.id);

    await logAction({
      req,
      action: "delete_user",
      entityType: "User",
      entityId: req.params.id,
      meta: { email: target.email }
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

    // ✅ Public-safe route: Get minimal user info (for case assignment display)
    router.get("/public", auth, async (req, res, next) => {
      try {
        // Fetch only minimal fields (no passwords, no admin-only data)
        const users = await User.find({}, "name email role isActive");
        res.json(users);
      } catch (e) {
        next(e);
      }
    });


export default router;
