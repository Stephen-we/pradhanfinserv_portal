import express from "express";
import Lead from "../models/Lead.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, mobile } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ message: "Name and Mobile are required" });
    }
    const lead = await Lead.create(req.body);
    res.status(201).json(lead);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { page = 1, q = "" } = req.query;
    const limit = 10;
    const filter = q ? { name: { $regex: q, $options: "i" } } : {};
    const [items, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Lead.countDocuments(filter),
    ]);
    res.json({ items, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
