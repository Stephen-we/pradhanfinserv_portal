import express from "express";
import Lead from "../models/Lead.js";
import { auth, allowRoles } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/leads
 * Supports: page, q, status
 */
router.get("/", auth, async (req, res, next) => {
  try {
    const { page = 1, q = "", status } = req.query;
    const limit = 10;

    const query = {};
    if (q) {
      query.$or = [
        { name: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { mobile: new RegExp(q, "i") },
        { leadId: new RegExp(q, "i") },
      ];
    }
    if (status) query.status = status;

    const items = await Lead.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Lead.countDocuments(query);
    res.json({ items, pages: Math.ceil(total / limit) });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/leads/:id
 */
router.get("/:id", auth, async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(lead);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/leads
 * Create new lead with duplicate check by name (across all statuses)
 */
router.post("/", auth, async (req, res, next) => {
  try {
    const { name } = req.body;

    // Duplicate check
    const existing = await Lead.findOne({ name });
    if (existing) {
      return res.status(400).json({
        message: `Customer "${name}" already exists in ${existing.status} leads`,
        id: existing._id,         // use this to navigate in frontend
        leadId: existing.leadId,  // human-readable id
        status: existing.status,
      });
    }

    const lead = new Lead(req.body);
    await lead.save();
    res.status(201).json(lead);
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/leads/:id
 * Edit lead (admin, superadmin, manager, officer)
 */
router.patch(
  "/:id",
  auth,
  allowRoles(["admin", "superadmin", "manager", "officer"]),
  async (req, res, next) => {
    try {
      const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.json(lead);
    } catch (e) {
      next(e);
    }
  }
);

/**
 * DELETE /api/leads/:id
 * Delete lead (admin, superadmin)
 */
router.delete(
  "/:id",
  auth,
  allowRoles(["admin", "superadmin"]),
  async (req, res, next) => {
    try {
      const lead = await Lead.findByIdAndDelete(req.params.id);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
