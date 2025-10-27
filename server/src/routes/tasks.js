import express from "express";
import Task from "../models/Task.js";
import { auth } from "../middleware/auth.js";
import { logAction } from "../middleware/audit.js";

const router = express.Router();

// Get tasks for a case
router.get("/case/:caseId", auth, async (req, res, next) => {
  try {
    const tasks = await Task.find({ case: req.params.caseId }).sort({ createdAt: 1 });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// Create new task
router.post("/", auth, async (req, res, next) => {
  try {
    const task = await Task.create(req.body);
    await logAction({
      req,
      action: "update_case",
      entityType: "Case",
      entityId: req.params.id,
      meta: { fields: Object.keys(req.body || {}) },
    });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// Update task
router.put("/:id", auth, async (req, res, next) => {
  try {
    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete task
router.delete("/:id", auth, async (req, res, next) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ✅ Export: Request OTP
//
router.post("/export/request-otp", auth, async (req, res, next) => {
  try {
    const result = await requestExportOtp(req, "export_leads");
    res.json(result);
  } catch (e) {
    next(e);
  }
});

//
// ✅ Export: Verify OTP and Download Data
//
router.post("/export/verify", auth, async (req, res, next) => {
  try {
    const { otp } = req.body;
    const check = await verifyExportOtp("export_leads", otp);
    if (!check.ok) return res.status(401).json({ message: check.message });

    const items = await Lead.find().select("leadId name mobile loanType status createdAt");
    res.json({ ok: true, items });
  } catch (e) {
    next(e);
  }
});

export default router;
