// server/src/routes/cases.js
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
import { generateOTP, saveOTP, verifyOTP } from "../utils/otp.js";
import { sendEmail } from "../utils/email.js"; // for OTP via email

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
  return mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : undefined;
};

/* -------------------------- routes ------------------------- */

// ✅ List Cases
router.get("/", auth, async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10, assignedTo, task } = req.query;
    const cond = {};

    if (q) {
      cond.$or = [
        { caseId: { $regex: q, $options: "i" } },
        { leadType: { $regex: q, $options: "i" } },
        { customerName: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
      ];
    }

    if (assignedTo && mongoose.isValidObjectId(assignedTo)) {
      cond.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }
    if (task) cond.task = task;

    const data = await listWithPagination(
      Case,
      cond,
      { page, limit, sort: { createdAt: -1 } },
      [
        { path: "assignedTo", select: "name role email", model: "User" },
        { path: "channelPartner", select: "name contact email", model: "ChannelPartner" },
        { path: "leadId", select: "leadType", model: "Lead" },
      ]
    );

    if (data?.items?.length) {
      data.items = data.items.map((item) => {
        const obj = item.toObject?.() || item;
        return { ...obj, leadType: obj.leadType || obj.leadId?.leadType || "" };
      });
    }

    res.json(data);
  } catch (e) {
    console.error("❌ Error loading cases:", e);
    next(e);
  }
});

// ✅ Get Single Case
router.get("/:id", auth, async (req, res, next) => {
  try {
    const item = await Case.findById(req.params.id)
      .populate("assignedTo", "name role email")
      .populate("channelPartner", "name contact email")
      .populate("leadId", "leadType");
    if (!item) return res.status(404).json({ message: "Case not found" });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

// ✅ Update Case (restrict assignedTo for non-admin)
router.put("/:id", auth, upload.array("documents"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const prev = await Case.findById(id);
    if (!prev) return res.status(404).json({ message: "Case not found" });

    const body = req.body || {};

    // Restrict assignedTo changes
    const userRole = req.user.role;
    if (body.assignedTo && !["admin", "superadmin"].includes(userRole)) {
      delete body.assignedTo;
      console.warn(`🚫 ${req.user.email} tried to change assignedTo`);
    }

    const updateData = {
      ...body,
      amount: parseAmount(body.amount),
      assignedTo: normalizeAssignedTo(body.assignedTo),
    };

    const item = await Case.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("assignedTo", "name role email")
      .populate("leadId", "leadType");

    await CaseAudit.create({ case: item._id, actor: req.user.id, action: "updated" });
    res.json(item);
  } catch (e) {
    console.error("❌ Case update error:", e);
    next(e);
  }
});

// ✅ Download All Documents
router.get("/:id/download", auth, async (req, res, next) => {
  try {
    const caseObj = await Case.findById(req.params.id);
    if (!caseObj) return res.status(404).json({ message: "Case not found" });

    const folderName =
      caseObj.customerName?.replace(/[^a-zA-Z0-9]/g, "_") || caseObj.caseId || "case_documents";

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${folderName}_documents.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    const uploadDirs = [
      path.join(process.cwd(), "server", "uploads"),
      path.join(process.cwd(), "uploads"),
    ];

    if (Array.isArray(caseObj.documentSections)) {
      for (const section of caseObj.documentSections) {
        for (const doc of section.documents || []) {
          for (const file of doc.files || []) {
            if (!file || file.isDeleted || file.isActive === false) continue;
            const filename = file.filename || path.basename(file.path || "");
            let filePath = null;
            for (const dir of uploadDirs) {
              const tryPath = path.join(dir, filename);
              if (fs.existsSync(tryPath)) {
                filePath = tryPath;
                break;
              }
            }
            if (filePath) {
              const zipPath = `${section.name || "Section"}/${doc.name || "Document"}/${file.originalname || filename}`;
              archive.file(filePath, { name: zipPath });
            }
          }
        }
      }
    }
    await archive.finalize();
  } catch (e) {
    next(e);
  }
});

// 🔐 Request OTP for export
router.post("/export/request-otp", auth, async (req, res, next) => {
  try {
    const code = generateOTP(6);
    saveOTP({ purpose: "export_cases", identifier: "owner", code, ttlSeconds: 300 });

    const ownerEmail = process.env.OWNER_EMAIL;
    if (ownerEmail) {
      await sendEmail(ownerEmail, "Export OTP", `Your OTP for data export is: ${code}`);
    }

    res.json({ ok: true, message: "OTP sent to owner’s email." });
  } catch (e) {
    console.error("❌ Export OTP error:", e);
    next(e);
  }
});

// 🔐 Verify OTP + Perform Export
router.post("/export/verify", auth, async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP required." });

    const v = verifyOTP({ purpose: "export_cases", identifier: "owner", code: String(otp) });
    if (!v.ok) {
      const map = { not_found: "OTP not found", expired: "OTP expired", mismatch: "Invalid OTP" };
      return res.status(401).json({ message: map[v.reason] || "OTP verification failed" });
    }

    const items = await Case.find()
      .populate("assignedTo", "name email")
      .select("caseId customerName leadType assignedTo bank branch amount createdAt");

    res.json({ ok: true, items });
  } catch (e) {
    console.error("❌ Export verify error:", e);
    next(e);
  }
});

export default router;
