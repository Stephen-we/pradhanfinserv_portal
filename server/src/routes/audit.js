import express from "express";
import { auth } from "../middleware/auth.js";
import AuditLog from "../models/AuditLog.js";

const router = express.Router();

// List audit logs (paginated)
router.get("/", auth, async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const q = (req.query.q || "").trim();

    const cond = {};
    if (q) {
      cond.$or = [
        { action: { $regex: q, $options: "i" } },
        { entityType: { $regex: q, $options: "i" } },
        { entityId: { $regex: q, $options: "i" } },
      ];
    }

    const total = await AuditLog.countDocuments(cond);
    const items = await AuditLog.find(cond)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("actor", "name email role");

    res.json({
      items,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (e) {
    next(e);
  }
});

export default router;
