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

const router = express.Router();

//
// ✅ List cases
//
router.get("/", auth, async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    const cond = q
      ? {
          $or: [
            { caseId: { $regex: q, $options: "i" } },
            { leadType: { $regex: q, $options: "i" } },
            { customerName: { $regex: q, $options: "i" } },
            { mobile: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const data = await listWithPagination(Case, cond, { page, limit }, [
      { path: "assignedTo", select: "name role", model: "User" },
      { path: "channelPartner", select: "name contact email", model: "ChannelPartner" },
    ]);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

//
// ✅ Get single case (auth)
//
router.get("/:id", auth, async (req, res, next) => {
  try {
    const item = await Case.findById(req.params.id)
      .populate("assignedTo", "name role")
      .populate("channelPartner", "name contact email");
    if (!item) return res.status(404).json({ message: "Case not found" });

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
    const item = await Case.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Case not found" });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

//
// ✅ Update case (AUTH) with delete support
//
router.put("/:id", auth, upload.array("documents"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const prev = await Case.findById(id);
    if (!prev) return res.status(404).json({ message: "Case not found" });

    const body = req.body || {};
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];

    console.log(`📁 Processing ${uploadedFiles.length} uploaded files for case ${id}`);

    // 🔹 1️⃣ Parse filesToDelete
    let filesToDelete = [];
    if (body.filesToDelete) {
      try {
        filesToDelete = JSON.parse(body.filesToDelete);
        console.log(`🗑️ Received ${filesToDelete.length} files to delete`);
      } catch (err) {
        console.warn("⚠️ Invalid JSON in filesToDelete");
      }
    }

    // 🔹 2️⃣ Remove those files from DB structure
    if (filesToDelete.length > 0 && prev.documentSections?.length) {
      prev.documentSections.forEach((section) => {
        section.documents.forEach((doc) => {
          doc.files = doc.files.filter((f) => {
            if (!f.filename && !f.originalname) return true;

            // ✅ Clean up filename & remove timestamp suffix like "-1759827991649"
            const normalize = (name) =>
              name
                ? name
                    .trim()
                    .toLowerCase()
                    .replace(/[-_]\d{10,}\.(pdf|jpg|jpeg|png)$/i, ".$1")
                : "";

            const fileNameClean = normalize(f.filename || "");
            const originalNameClean = normalize(f.originalname || "");

            // ✅ Check if any deleted entry matches cleaned filename or original name
            return !filesToDelete.some((del) => {
              const delClean = normalize(del);
              return (
                delClean === fileNameClean ||
                delClean === originalNameClean ||
                (f._id && delClean === f._id.toString().toLowerCase())
              );
            });
          });
        });
      });

      // Physically delete from uploads folder
      const uploadDir = path.join(process.cwd(), "server", "uploads");
      filesToDelete.forEach((filename) => {
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log("🧹 Deleted file:", filename);
          } catch (e) {
            console.error("❌ Error deleting file:", filename, e.message);
          }
        }
      });
    }

    // 🔹 3️⃣ Add new uploaded files
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

    // Flatten existing files
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

    const updateData = {
      customerName: body.customerName || body.name,
      mobile: body.mobile || body.primaryMobile,
      email: body.email,
      applicant2Name: body.applicant2Name,
      applicant2Mobile: body.applicant2Mobile,
      applicant2Email: body.applicant2Email,
      leadType: body.leadType,
      subType: body.subType,
      amount: body.amount ? Number(body.amount) : undefined,
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

    // 🧩 Auto-restore default KYC structure when all files deleted
    if (Array.isArray(updateData.documentSections)) {
      const totalFiles = updateData.documentSections.reduce(
        (sum, section) =>
          sum +
          (Array.isArray(section.documents)
            ? section.documents.reduce(
                (dSum, doc) => dSum + (Array.isArray(doc.files) ? doc.files.length : 0),
                0
              )
            : 0),
        0
      );

      if (totalFiles === 0) {
        console.log("🔁 Restoring default KYC structure (backend)");

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
    }

    const item = await Case.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    await CaseAudit.create({ case: item._id, actor: req.user.id, action: "updated" });

    console.log(
      `✅ Saved case ${id} - ${newFileObjects.length} new, ${filesToDelete.length} deleted, total ${allFiles.length}`
    );

    res.json(item);
  } catch (e) {
    console.error("❌ Case update error:", e);
    next(e);
  }
});

//
// 🔓 Public update (NO AUTH)
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
        console.log(`🗑️ PUBLIC delete count: ${filesToDelete.length}`);
      } catch (err) {}
    }

    if (filesToDelete.length > 0 && prev.documentSections?.length) {
      prev.documentSections.forEach((section) => {
        section.documents.forEach((doc) => {
          doc.files = doc.files.filter(
            (f) => !filesToDelete.includes(f.filename)
          );
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

    // 🧩 Auto-restore default KYC structure when all files deleted (Public)
    if (Array.isArray(updateData.documentSections)) {
      const totalFiles = updateData.documentSections.reduce(
        (sum, section) =>
          sum +
          (Array.isArray(section.documents)
            ? section.documents.reduce(
                (dSum, doc) => dSum + (Array.isArray(doc.files) ? doc.files.length : 0),
                0
              )
            : 0),
        0
      );

      if (totalFiles === 0) {
        console.log("🔁 Restoring default KYC structure (public backend)");

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
    }

    const item = await Case.findByIdAndUpdate(id, updateData, { new: true });
    await CaseAudit.create({ case: item._id, actor: null, action: "updated" });

    res.json(item);
  } catch (e) {
    console.error("❌ PUBLIC update error:", e);
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

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${folderName}_documents.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    let count = 0;
    const uploadDir = path.join(process.cwd(), "server", "uploads");
    if (Array.isArray(caseObj.documentSections)) {
      for (const section of caseObj.documentSections) {
        for (const doc of section.documents || []) {
          for (const file of doc.files || []) {
            const filePath = path.join(uploadDir, file.filename);
            if (fs.existsSync(filePath)) {
              archive.file(filePath, {
                name: `${section.name}/${doc.name}/${file.originalname || file.filename}`,
              });
              count++;
            }
          }
        }
      }
    }

    console.log(`📦 Archiving ${count} files for download`);
    archive.finalize();
  } catch (e) {
    console.error("❌ ZIP error:", e);
    next(e);
  }
});

export default router;
