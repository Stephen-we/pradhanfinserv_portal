//server/src/routes/partners.js
import express from "express";
import Partner from "../models/ChannelPartner.js";
import { auth } from "../middleware/auth.js";
import { listWithPagination } from "../utils/paginate.js";
const router = express.Router();
import { logAction } from "../middleware/audit.js";


// GET /channel-partners - Get all channel partners with search and pagination
router.get("/", auth, async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    
    // Build search condition
    const cond = q ? {
      $or: [
        { name: { $regex: q, $options: "i" } },
        { partnerId: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } } // ✅ Added email search
      ]
    } : {};

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // ✅ Limit max items per page

    const data = await listWithPagination(Partner, cond, {
      page: pageNum,
      limit: limitNum,
      sort: { name: 1 } // ✅ Consistent sorting
    });
   
    await logAction({
      req,
      action: "update_case",
      entityType: "Case",
      entityId: req.params.id,
      meta: { fields: Object.keys(req.body || {}) },
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
});

// POST /channel-partners - Create new partner
router.post("/", auth, async (req, res, next) => {
  try {
    // ✅ Basic validation
    const { name, email, phone } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Partner name is required" });
    }

    // ✅ Check for duplicate partner by name or email
    const existingPartner = await Partner.findOne({
      $or: [
        { name: { $regex: `^${name.trim()}$`, $options: "i" } },
        ...(email ? [{ email: { $regex: `^${email.trim()}$`, $options: "i" } }] : [])
      ]
    });

    if (existingPartner) {
      return res.status(409).json({
        message: "Partner with this name or email already exists",
        existingId: existingPartner._id
      });
    }

    // ✅ Generate sequential partner ID
    const lastPartner = await Partner.findOne().sort({ createdAt: -1 });
    const nextId = lastPartner && lastPartner.partnerId
      ? "CP" + (parseInt(lastPartner.partnerId.replace("CP", ""), 10) + 1).toString().padStart(5, "0")
      : "CP10001";

    const newPartner = await Partner.create({
      ...req.body,
      partnerId: nextId,
      name: name.trim(),
      ...(email && { email: email.trim() })
    });

    res.status(201).json(newPartner);
  } catch (e) {
    if (e.name === 'ValidationError') {
      return res.status(400).json({ message: e.message });
    }
    next(e);
  }
});

// PUT /channel-partners/:id - Update partner
router.put("/:id", auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // ✅ Check if partner exists
    const existingPartner = await Partner.findById(id);
    if (!existingPartner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    // ✅ Prevent duplicate names on update
    if (req.body.name) {
      const duplicate = await Partner.findOne({
        name: { $regex: `^${req.body.name.trim()}$`, $options: "i" },
        _id: { $ne: id } // Exclude current partner
      });

      if (duplicate) {
        return res.status(409).json({
          message: "Another partner with this name already exists"
        });
      }
      req.body.name = req.body.name.trim();
    }

    const updatedPartner = await Partner.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true } // ✅ Run model validations
    );

    res.json(updatedPartner);
  } catch (e) {
    if (e.name === 'ValidationError') {
      return res.status(400).json({ message: e.message });
    }
    if (e.name === 'CastError') {
      return res.status(400).json({ message: "Invalid partner ID" });
    }
    next(e);
  }
});

// DELETE /channel-partners/:id - Delete partner
router.delete("/:id", auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // ✅ Check if partner exists before deleting
    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    // ✅ Optional: Check if partner is being used in any leads before deletion
    // const leadsCount = await Lead.countDocuments({ channelPartner: id });
    // if (leadsCount > 0) {
    //   return res.status(400).json({
    //     message: `Cannot delete partner. Used in ${leadsCount} lead(s).`
    //   });
    // }

    await Partner.findByIdAndDelete(id);
    res.json({
      ok: true,
      message: `Partner "${partner.name}" deleted successfully`
    });
  } catch (e) {
    if (e.name === 'CastError') {
      return res.status(400).json({ message: "Invalid partner ID" });
    }
    next(e);
  }
});

export default router;