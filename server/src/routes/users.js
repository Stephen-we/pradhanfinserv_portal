import express from "express";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js"; // ✅ FIXED

const router = express.Router();

// ✅ Create user
router.post("/", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (req.user.role === "admin" && role === "superadmin") {
      return res.status(403).json({ message: "Admins cannot create superadmins" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const user = new User({ name, email, password, role });
    await user.save();
    res.status(201).json({ ok: true, id: user._id });
  } catch (e) {
    next(e);
  }
});

// ✅ Get users
router.get("/", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (e) {
    next(e);
  }
});

// ✅ Update role
router.patch("/:id/role", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (req.user.role === "admin" && role === "superadmin") {
      return res.status(403).json({ message: "Admins cannot assign superadmin" });
    }
    const u = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
    res.json(u);
  } catch (e) {
    next(e);
  }
});

// ✅ Toggle active
router.patch("/:id/active", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const u = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true }).select("-password");
    res.json(u);
  } catch (e) {
    next(e);
  }
});

// ✅ Reset password
router.patch("/:id/password", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
  try {
    const { password } = req.body;
    const u = await User.findById(req.params.id).select("+password");
    if (!u) return res.status(404).json({ message: "Not found" });

    if (u.role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only superadmin can reset another superadmin's password" });
    }

    u.password = password;
    await u.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ✅ Edit user (name/email)
router.patch("/:id", auth, allowRoles(["admin","superadmin"]), async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const u = await User.findByIdAndUpdate(req.params.id, { name, email }, { new:true }).select("-password");
    if (!u) return res.status(404).json({ message: "Not found" });
    res.json(u);
  } catch (e) {
    next(e);
  }
});

// ✅ Delete user
router.delete("/:id", auth, allowRoles(["admin","superadmin"]), async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok:true });
  } catch (e) {
    next(e);
  }
});

export default router;
