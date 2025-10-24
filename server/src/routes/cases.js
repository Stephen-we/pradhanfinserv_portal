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

//
// ✅ List cases
//
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

    if (assignedTo && typeof assignedTo === "string" && assignedTo.trim() !== "") {
      if (mongoose.isValidObjectId(assignedTo)) {
        cond.assignedTo = new mongoose.Types.ObjectId(assignedTo);
      }
    }

    if (task && typeof task === "string" && task.trim() !== "") cond.task = task;

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

//
// ✅ Get single case (auth) + logAction
//
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

//
// 🔓 Public GET
//
router.get("/:id/public", async (req, res, next) => {
  try {
    const item = await Case.findById(req.params.id)
      .populate("assignedTo", "name role email")
      .populate("leadId", "leadType");
    if (!item) return res.status(404).json({ message: "Case not found" });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

//
// ✅ Update case (auth) — keeps A’s upload/save logic + B’s security
//
router.put("/:id", auth, upload.array("documents"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const prev = await Case.findById(id);
    if (!prev) return res.status(404).json({ message: "Case not found" });

    const body = req.body || {};
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];

    // 🔐 Restrict assignedTo to admin/superadmin
    const userRole = req.user?.role;
    if (body.assignedTo && !["admin", "superadmin"].includes(userRole)) {
      delete body.assignedTo;
      console.warn(`🚫 ${req.user.email} tried to change assignedTo`);
    }

    // 🔹 Parse filesToDelete
    let filesToDelete = [];
    if (body.filesToDelete) {
      try {
        filesToDelete = JSON.parse(body.filesToDelete);
      } catch (err) {
        console.warn("⚠️ Invalid JSON in filesToDelete");
      }
    }

    // 🔹 Remove deleted files
    if (filesToDelete.length > 0 && prev.documentSections?.length) {
      prev.documentSections.forEach((section) => {
        section.documents.forEach((doc) => {
          doc.files = doc.files.filter((f) => {
            const fn = f.filename || f.originalname || "";
            return !filesToDelete.includes(fn);
          });
        });
      });

      const uploadDir = path.join(process.cwd(), "server", "uploads");
      filesToDelete.forEach((filename) => {
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }

    // 🔹 Add new uploaded files
    const newFileObjects = uploadedFiles.map((file) => ({
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      uploadDate: new Date(),
      isUploaded: true,
      isActive: true,
      isDeleted: false,
    }));

    // 🔹 Keep existing files
    const existingFiles = [];
    if (prev.documentSections) {
      prev.documentSections.forEach((s) => {
        s.documents.forEach((d) => {
          d.files.forEach((f) => {
            if (!f.isDeleted && f.isActive !== false) existingFiles.push(f);
          });
        });
      });
    }

    const allFiles = [...existingFiles];
    newFileObjects.forEach((f) => {
      const dup = allFiles.some((ef) => ef.filename === f.filename);
      if (!dup) allFiles.push(f);
    });

    // 🔹 Update structure
    const updateData = {
      customerName: body.customerName || body.name,
      mobile: body.mobile || body.primaryMobile,
      email: body.email,
      applicant2Name: body.applicant2Name,
      applicant2Mobile: body.applicant2Mobile,
      applicant2Email: body.applicant2Email,
      leadType: body.leadType,
      subType: body.subType,
      bank: body.bank,
      branch: body.branch,
      status: body.status,
      permanentAddress: body.permanentAddress,
      currentAddress: body.currentAddress,
      siteAddress: body.siteAddress,
      officeAddress: body.officeAddress,
      panNumber: body.panNumber,
      aadharNumber: body.aadharNumber,
      notes: body.notes,
      amount: parseAmount(body.amount),
      assignedTo: normalizeAssignedTo(body.assignedTo),
      channelPartner: normalizeChannelPartner(body.channelPartner),
      task: body.task,
      documentSections: [
        {
          id: "section-main-documents",
          name: "Case Documents",
          documents: [
            { id: "doc-all-files", name: "All Uploaded Files", files: allFiles },
          ],
        },
      ],
    };

    // 🧩 Restore default structure if no files
    if (allFiles.length === 0) {
      updateData.documentSections = [
        {
          id: "section-1",
          name: "KYC Documents",
          documents: [
            { id: "doc-1-1", name: "Photo 4 each (A & C)", files: [] },
            { id: "doc-1-2", name: "PAN Self attested - A & C", files: [] },
            { id: "doc-1-3", name: "Aadhar - self attested - A & C", files: [] },
            { id: "doc-1-4", name: "Address Proof (Resident & Shop/Company)", files: [] },
            { id: "doc-1-5", name: "Shop Act/Company Registration/Company PAN", files: [] },
            { id: "doc-1-6", name: "Bank statement last 12 months (CA and SA)", files: [] },
            { id: "doc-1-7", name: "GST/Trade/Professional Certificate", files: [] },
            { id: "doc-1-8", name: "Udyam Registration/Certificate", files: [] },
            { id: "doc-1-9", name: "ITR last 3 years (Computation / P&L / Balance Sheet)", files: [] },
            { id: "doc-1-10", name: "Marriage Certificate (if required)", files: [] },
            { id: "doc-1-11", name: "Partnership Deed (if required)", files: [] },
            { id: "doc-1-12", name: "MOA & AOA Company Registration", files: [] },
            { id: "doc-1-13", name: "Form 26AS Last 3 Years", files: [] },
          ],
        },
      ];
    }

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

//
// 🔓 Public update (NO AUTH) — same logic as A
//
router.put("/:id/public", upload.array("documents"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const prev = await Case.findById(id);
    if (!prev) return res.status(404).json({ message: "Case not found" });

    const body = req.body || {};
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];

    let filesToDelete = [];
    if (body.filesToDelete) {
      try {
        filesToDelete = JSON.parse(body.filesToDelete);
      } catch {}
    }

    if (filesToDelete.length > 0 && prev.documentSections?.length) {
      prev.documentSections.forEach((section) => {
        section.documents.forEach((doc) => {
          doc.files = doc.files.filter((f) => !filesToDelete.includes(f.filename));
        });
      });
      const uploadDir = path.join(process.cwd(), "server", "uploads");
      filesToDelete.forEach((filename) => {
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }

    const newFiles = uploadedFiles.map((file) => ({
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      uploadDate: new Date(),
      isUploaded: true,
      isActive: true,
      isDeleted: false,
    }));

    const allFiles = [];
    prev.documentSections.forEach((s) => {
      s.documents.forEach((d) => {
        allFiles.push(...d.files);
      });
    });
    allFiles.push(...newFiles);

    const updateData = {
      ...body,
      documentSections: [
        {
          id: "section-main-documents",
          name: "Case Documents",
          documents: [
            { id: "doc-all-files", name: "All Uploaded Files", files: allFiles },
          ],
        },
      ],
    };

    const item = await Case.findByIdAndUpdate(id, updateData, { new: true });
    await CaseAudit.create({ case: item._id, actor: null, action: "updated" });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

//
// ✅ Download all documents as ZIP (same as A)
//
router.get("/:id/download", auth, async (req, res, next) => {
  try {
    const caseObj = await Case.findById(req.params.id);
    if (!caseObj) return res.status(404).json({ message: "Case not found" });

    const folderName =
      caseObj.customerName?.replace(/[^a-zA-Z0-9]/g, "_") ||
      caseObj.caseId ||
      "case_documents";

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
      path.join(process.cwd(), "src", "uploads"),
    ];

    if (Array.isArray(caseObj.documentSections)) {
      for (const section of caseObj.documentSections) {
        for (const doc of section.documents || []) {
          for (const file of doc.files || []) {
            if (!file || file.isDeleted || file.isActive === false) continue;
            const filename = file.filename || path.basename(file.path || "");
            if (!filename) continue;
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

//
// ✅ OTP Export System from B
//
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
    next(e);
  }
});

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
    next(e);
  }
});

export default router;