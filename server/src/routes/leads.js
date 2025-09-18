import express from "express";
import Lead from "../models/Lead.js";
const router = express.Router();

// GET all leads (with pagination & search)
router.get("/", async (req, res) => {
  try {
    const { page = 1, q = "" } = req.query;
    const limit = 10;
    const filter = q ? { name: { $regex: q, $options: "i" } } : {};
    const total = await Lead.countDocuments(filter);
    const items = await Lead.find(filter)
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ items, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create lead
router.post("/", async (req, res) => {
  try {
    const lead = new Lead(req.body);
    await lead.save();
    res.json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT assign lead
router.put("/:id/assign", async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { assignedTo, status: "assigned" },
      { new: true }
    ).populate("assignedTo", "name email");
    res.json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET single lead
router.get("/:id", async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate("assignedTo", "name email");
    res.json(lead);
  } catch (err) {
    res.status(404).json({ error: "Lead not found" });
  }
});

export default router;
