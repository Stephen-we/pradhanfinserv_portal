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

export default router;
