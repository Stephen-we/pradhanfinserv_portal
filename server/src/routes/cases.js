import express from "express";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import mongoose from "mongoose";

import Case from "../models/Case.js";
import CaseAudit from "../models/CaseAudit.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import { listWithPagination } from "../utils/paginate.js";
import { upload } from "../middleware/uploads.js";

const router = express.Router();

//
// ✅ List with pagination + search (single, enhanced version)
//
router.get("/", auth, async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    const cond = q
      ? {
          $or: [
            { caseId: { $regex: q, $options: "i" } },
            { loanType: { $regex: q, $options: "i" } },
            { customerName: { $regex: q, $options: "i" } },
            { mobile: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const data = await listWithPagination(
      Case,
      cond,
      { page, limit },
      { path: "assignedTo", select: "name role", model: "User" }
    );

    res.json(data);
  } catch (e) {
    next(e);
  }
});

//
// ✅ Get single case - normalize kycDocs + support documentSections (AUTH)
//
router.get("/:id", auth, async (req, res, next) => {
  try {
    const item = await Case.findById(req.params.id).populate(
      "assignedTo",
      "name role"
    );
    if (!item) return res.status(404).json({ message: "Case not found" });

    const caseObj = item.toObject();

    // Normalize legacy kycDocs
    let normalized = {};
    if (item.kycDocs instanceof Map) {
      normalized = Object.fromEntries(item.kycDocs);
    } else if (caseObj.kycDocs && typeof caseObj.kycDocs === "object") {
      normalized = { ...caseObj.kycDocs };
    }
    Object.keys(normalized).forEach((k) => {
      const val = normalized[k];
      normalized[k] = Array.isArray(val) ? val : [val].filter(Boolean);
    });
    caseObj.kycDocs = normalized;

    // Normalize new documentSections
    if (caseObj.documentSections && Array.isArray(caseObj.documentSections)) {
      caseObj.documentSections = caseObj.documentSections.map((section) => ({
        ...section,
        documents:
          section.documents?.map((doc) => ({
            ...doc,
            files: doc.files || [],
          })) || [],
      }));
    }

    res.json(caseObj);
  } catch (e) {
    next(e);
  }
});

//
// 🔓 PUBLIC: Get single case for public form (NO AUTH)
//
router.get("/:id/public", async (req, res, next) => {
  try {
    const item = await Case.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Case not found" });

    const caseObj = item.toObject();

    // Normalize legacy kycDocs
    let normalized = {};
    if (item.kycDocs instanceof Map) {
      normalized = Object.fromEntries(item.kycDocs);
    } else if (caseObj.kycDocs && typeof caseObj.kycDocs === "object") {
      normalized = { ...caseObj.kycDocs };
    }
    Object.keys(normalized).forEach((k) => {
      const val = normalized[k];
      normalized[k] = Array.isArray(val) ? val : [val].filter(Boolean);
    });
    caseObj.kycDocs = normalized;

    // Normalize new documentSections
    if (caseObj.documentSections && Array.isArray(caseObj.documentSections)) {
      caseObj.documentSections = caseObj.documentSections.map((section) => ({
        ...section,
        documents:
          section.documents?.map((doc) => ({
            ...doc,
            files: doc.files || [],
          })) || [],
      }));
    }

    res.json(caseObj);
  } catch (e) {
    next(e);
  }
});

//
// ✅ Update case with support for both KYC docs and documentSections (AUTH)
//
router.put("/:id", auth, upload.any(), async (req, res, next) => {
  try {
    const prev = await Case.findById(req.params.id);
    if (!prev) return res.status(404).json({ message: "Case not found" });

    const prevAssigned = prev.assignedTo ? String(prev.assignedTo) : null;

    const body = req.body || {};
    const updateData = {
      customerName: body.customerName || body.name,
      mobile: body.mobile || body.primaryMobile,
      email: body.email,
      applicant2Name: body.applicant2Name,
      applicant2Mobile: body.applicant2Mobile,
      applicant2Email: body.applicant2Email,

      // ✅ NEW: Keep leadType & subType in updates
      leadType: body.leadType,
      subType: body.subType,

      loanType: body.loanType,
      amount:
        body.amount && body.amount !== "null" ? Number(body.amount) : undefined,
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
      disbursedAmount:
        body.disbursedAmount && body.disbursedAmount !== "null"
          ? Number(body.disbursedAmount)
          : undefined,
      task: body.task,
    };

    // ✅ AssignedTo handling...
    let resolvedAssignedTo;
    if ("assignedTo" in body) {
      const raw = body.assignedTo;

      if (raw === "" || raw === "null" || raw == null) {
        resolvedAssignedTo = null;
      } else if (typeof raw === "object" && raw?._id) {
        resolvedAssignedTo = String(raw._id);
      } else if (mongoose.Types.ObjectId.isValid(String(raw))) {
        const exists = await User.exists({ _id: raw });
        if (!exists)
          return res.status(400).json({ message: "Assigned user not found" });
        resolvedAssignedTo = String(raw);
      } else {
        return res.status(400).json({ message: "Invalid assignedTo value" });
      }
    }
    if (resolvedAssignedTo !== undefined) {
      updateData.assignedTo = resolvedAssignedTo;
    }

    // 🔹 Handle documentSections...
    let documentSections = [];
    try {
      let raw = body.documentSections;
      if (typeof raw === "string") {
        documentSections = JSON.parse(raw);
      } else if (Array.isArray(raw)) {
        documentSections = raw;
      } else if (raw && typeof raw === "object") {
        documentSections = [raw];
      }

      if (Array.isArray(documentSections)) {
        const processedSections = documentSections.map(
          (section, sectionIndex) => ({
            id: section.id || `section-${sectionIndex}-${Date.now()}`,
            name: section.name || "Untitled Section",
            documents: (section.documents || []).map((doc, docIndex) => ({
              id: doc.id || `doc-${sectionIndex}-${docIndex}-${Date.now()}`,
              name: doc.name || "Untitled Document",
              files: [...(doc.files || [])],
            })),
          })
        );
        updateData.documentSections = processedSections;
        updateData.kycDocs = {};
      }
    } catch {
      updateData.documentSections = [];
      updateData.kycDocs = {};
    }

    const item = await Case.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("assignedTo", "name role");

    await CaseAudit.create({
      case: item._id,
      actor: req.user.id,
      action: "updated",
    });

    res.json(item);
  } catch (e) {
    next(e);
  }
});

//
// 🔓 PUBLIC: Update case (NO AUTH) — for clients via public form
//
router.put("/:id/public", upload.any(), async (req, res, next) => {
  try {
    const prev = await Case.findById(req.params.id);
    if (!prev) return res.status(404).json({ message: "Case not found" });

    const body = req.body || {};
    const updateData = {
      customerName: body.customerName || body.name,
      mobile: body.mobile || body.primaryMobile,
      email: body.email,
      applicant2Name: body.applicant2Name,
      applicant2Mobile: body.applicant2Mobile,
      applicant2Email: body.applicant2Email,

      // ✅ NEW: Keep leadType & subType in public updates too
      leadType: body.leadType,
      subType: body.subType,

      loanType: body.loanType,
      amount:
        body.amount && body.amount !== "null" ? Number(body.amount) : undefined,
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
      disbursedAmount:
        body.disbursedAmount && body.disbursedAmount !== "null"
          ? Number(body.disbursedAmount)
          : undefined,
      task: body.task,
    };

    // 🔹 Handle documentSections (same as above)
    let documentSections = [];
    try {
      let raw = body.documentSections;
      if (typeof raw === "string") {
        documentSections = JSON.parse(raw);
      } else if (Array.isArray(raw)) {
        documentSections = raw;
      } else if (raw && typeof raw === "object") {
        documentSections = [raw];
      }

      if (Array.isArray(documentSections)) {
        const processedSections = documentSections.map(
          (section, sectionIndex) => ({
            id: section.id || `section-${sectionIndex}-${Date.now()}`,
            name: section.name || "Untitled Section",
            documents: (section.documents || []).map((doc, docIndex) => ({
              id: doc.id || `doc-${sectionIndex}-${docIndex}-${Date.now()}`,
              name: doc.name || "Untitled Document",
              files: [...(doc.files || [])],
            })),
          })
        );
        updateData.documentSections = processedSections;
        updateData.kycDocs = {};
      }
    } catch {
      updateData.documentSections = [];
      updateData.kycDocs = {};
    }

    const item = await Case.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    await CaseAudit.create({
      case: item._id,
      actor: null,
      action: "updated_public",
    });

    res.json(item);
  } catch (e) {
    next(e);
  }
});

//
// ✅ Download all documents as ZIP
//
router.get("/:id/download", auth, async (req, res, next) => {
  try {
    const caseObj = await Case.findById(req.params.id);
    if (!caseObj) return res.status(404).json({ message: "Case not found" });

    const folderName =
      caseObj.customerName?.replace(/[^a-zA-Z0-9]/g, "_") ||
      caseObj.caseId ||
      "case_documents";
    res.attachment(`${folderName}_documents.zip`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    let fileCount = 0;

    // ✅ New structure
    if (caseObj.documentSections && Array.isArray(caseObj.documentSections)) {
      for (const section of caseObj.documentSections) {
        const sectionName =
          section.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Unnamed_Section";
        for (const doc of section.documents || []) {
          const docName =
            doc.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Unnamed_Document";
          for (const file of doc.files || []) {
            const filename = file.filename || file.name;
            if (filename) {
              const filePath = path.join(
                process.cwd(),
                "server",
                "uploads",
                filename
              );
              if (fs.existsSync(filePath)) {
                archive.file(filePath, {
                  name: `${sectionName}/${docName}/${filename}`,
                });
                fileCount++;
              }
            }
          }
        }
      }
    }

    // ✅ Legacy structure fallback
    if (fileCount === 0 && caseObj.kycDocs) {
      const kycDocs =
        caseObj.kycDocs instanceof Map
          ? Object.fromEntries(caseObj.kycDocs)
          : caseObj.kycDocs || {};
      Object.entries(kycDocs).forEach(([fieldName, files]) => {
        const fileArray = Array.isArray(files) ? files : [files].filter(Boolean);
        fileArray.forEach((file) => {
          const filename = typeof file === "string" ? file : file.filename;
          if (filename) {
            const filePath = path.join(
              process.cwd(),
              "server",
              "uploads",
              filename
            );
            if (fs.existsSync(filePath)) {
              archive.file(filePath, { name: `KYC_Documents/${filename}` });
              fileCount++;
            }
          }
        });
      });
    }

    if (fileCount === 0) {
      return res.status(404).json({ message: "No documents found to download" });
    }

    archive.finalize();
  } catch (e) {
    next(e);
  }
});

export default router;
