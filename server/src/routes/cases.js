import express from "express";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import mongoose from "mongoose";
import Case from "../models/Case.js";
import CaseAudit from "../models/CaseAudit.js";
import { auth } from "../middleware/auth.js";
import { upload } from "../middleware/uploads.js";
import { listWithPagination } from "../utils/paginate.js";
import { logAction } from "../middleware/audit.js";
import { generateOTP, saveOTP, verifyOTP } from "../utils/otp.js";
import { sendEmail } from "../utils/email.js";

const router = express.Router();

/* -------------------------- helpers ------------------------- */
const parseAmount = (v) => {
  if (v === undefined) return undefined;
  if (v === null || v === "null" || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

const normalizeAssignedTo = (v) => {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v === "object" && v?._id) v = v._id;
  return mongoose.isValidObjectId(v)
    ? new mongoose.Types.ObjectId(v)
    : undefined;
};

const normalizeChannelPartner = (v) => {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v === "object" && v?._id) v = v._id;
  return mongoose.isValidObjectId(v)
    ? new mongoose.Types.ObjectId(v)
    : undefined;
};

/* --------------------------------- routes --------------------------------- */

// ✅ List, Get, Update, Public routes (UNCHANGED)
router.get("/", auth, async (req, res, next) => {
  try {
    const {
      q,
      page = 1,
      limit = 10,
      assignedTo,
      task,
      status,
      leadType,
      bank,
      branch,
    } = req.query;

    const cond = {};

    if (q) {
      cond.$or = [
        { caseId: { $regex: q, $options: "i" } },
        { leadType: { $regex: q, $options: "i" } },
        { customerName: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    if (assignedTo && mongoose.isValidObjectId(assignedTo)) {
      cond.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    if (task) cond.task = task;
    if (status) cond.status = status;
    if (leadType) cond.leadType = leadType;
    if (bank) cond.bank = bank;
    if (branch) cond.branch = branch;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));

    const data = await listWithPagination(
      Case,
      cond,
      { page: pageNum, limit: limitNum, sort: { createdAt: -1 } },
      [
        { path: "assignedTo", select: "name role email" },
        { path: "channelPartner", select: "name contact email" },
        { path: "leadId", select: "leadType" },
      ]
    );

    if (data?.items?.length) {
      const incomplete = data.items.filter((i) => i.task !== "Complete");
      const completed = data.items.filter((i) => i.task === "Complete");

      data.items = [...incomplete, ...completed].map((item) => {
        const obj = item.toObject?.() || item;
        return { ...obj, leadType: obj.leadType || obj.leadId?.leadType || "" };
      });
    }

    const totalPages = Math.ceil(data.total / limitNum);
    res.json({
      ...data,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: data.total,
        itemsPerPage: limitNum,
      },
    });
  } catch (e) {
    console.error("❌ Error loading cases:", e);
    next(e);
  }
});

router.get("/:id", auth, async (req, res, next) => {
  try {
    const item = await Case.findById(req.params.id)
      .populate("assignedTo", "name role email")
      .populate("channelPartner", "name contact email")
      .populate("leadId", "leadType");
    if (!item) return res.status(404).json({ message: "Case not found" });

    await logAction({
      req,
      action: "view_case",
      entityType: "Case",
      entityId: req.params.id,
    });

    res.json(item);
  } catch (e) {
    next(e);
  }
});

router.put("/:id", auth, upload.array("documents"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const prev = await Case.findById(id);
    if (!prev) return res.status(404).json({ message: "Case not found" });

    const body = req.body || {};
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];

    if (body.task === "Complete" && prev.task !== "Complete") {
      return res.status(403).json({
        message:
          'Cannot manually assign "Complete" task. Change customer status to "closed" instead.',
      });
    }

    const updateData = {
      ...body,
      amount: parseAmount(body.amount),
      assignedTo: normalizeAssignedTo(body.assignedTo),
      channelPartner: normalizeChannelPartner(body.channelPartner),
    };

    const item = await Case.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("assignedTo", "name role email")
      .populate("leadId", "leadType");

    await CaseAudit.create({ case: item._id, actor: req.user.id, action: "updated" });

    await logAction({
      req,
      action: "update_case",
      entityType: "Case",
      entityId: id,
    });

    res.json(item);
  } catch (e) {
    console.error("❌ Case update error:", e);
    next(e);
  }
});

/* ----------------------- ✅ EXPORT SYSTEM (ENHANCED) ----------------------- */

router.post("/export/request-otp", auth, async (req, res, next) => {
  try {
    const code = generateOTP(6);
    saveOTP({ purpose: "export_cases", identifier: "owner", code, ttlSeconds: 300 });

    const user = req.user || {};
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.connection.remoteAddress ||
      req.ip ||
      "Unknown IP";

    const ownerEmail = process.env.OWNER_EMAIL;
    const emailBody = `
🔐 OTP for Case Export: ${code}

Requested by:
👤 Name: ${user.name || "Unknown"}
📧 Email: ${user.email || "Unknown"}
🧩 Role: ${user.role || "Unknown"}
🌐 IP: ${ipAddress}

Valid for 5 minutes.
`;

    if (ownerEmail) {
      await sendEmail(ownerEmail, "Case Export OTP Request", emailBody);
    }

    res.json({
      ok: true,
      message: `OTP sent to owner's email.`,
      requester: { name: user.name, email: user.email, ip: ipAddress },
    });
  } catch (e) {
    console.error("❌ Export OTP error:", e);
    next(e);
  }
});

router.post("/export/verify", auth, async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP required." });

    const v = verifyOTP({ purpose: "export_cases", identifier: "owner", code: String(otp) });
    if (!v.ok) {
      const map = {
        not_found: "OTP not found",
        expired: "OTP expired",
        mismatch: "Invalid OTP",
      };
      return res.status(401).json({ message: map[v.reason] || "OTP verification failed" });
    }

    const items = await Case.find()
      .populate("assignedTo", "name email")
      .select("caseId customerName leadType assignedTo bank branch amount createdAt");

    res.json({ ok: true, items });
  } catch (e) {
    console.error("❌ Export Verify Error:", e);
    next(e);
  }
});

export default router;
