// server/src/routes/cases.js
import express from "express";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import Case from "../models/Case.js";
import CaseAudit from "../models/CaseAudit.js";
import { auth } from "../middleware/auth.js";
import { listWithPagination } from "../utils/paginate.js";
import { upload } from "../middleware/uploads.js";

const router = express.Router();

//
// ✅ List with pagination + search
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
      { path: "assignedTo", select: "name role" }
    );

    res.json(data);
  } catch (e) {
    next(e);
  }
});

//
// ✅ Get single case - normalize kycDocs + support documentSections
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

    // Ensure new documentSections are normalized
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
// ✅ Update case with support for both KYC docs and documentSections
//
router.put("/:id", auth, upload.any(), async (req, res, next) => {
  try {
    console.log("=== CASE UPDATE REQUEST ===");
    console.log("🔎 req.body keys:", Object.keys(req.body));
    console.log("🔎 req.files count:", req.files?.length || 0);
    console.log("🔎 documentSections in body:", !!req.body.documentSections);

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

    // 🔹 Handle NEW documentSections
      let documentSections = [];

      try {
        let raw = body.documentSections;
        
        // Handle both string and object input safely
        if (typeof raw === 'string') {
          documentSections = JSON.parse(raw);
        } else if (Array.isArray(raw)) {
          documentSections = raw;
        } else if (raw && typeof raw === 'object') {
          documentSections = [raw];
        }
        
        console.log("✅ Parsed documentSections:", documentSections?.length || 0, "sections");

        // Process document sections structure
        if (Array.isArray(documentSections)) {
          const processedSections = documentSections.map((section, sectionIndex) => ({
            id: section.id || `section-${sectionIndex}-${Date.now()}`,
            name: section.name || "Untitled Section",
            documents: (section.documents || []).map((doc, docIndex) => ({
              id: doc.id || `doc-${sectionIndex}-${docIndex}-${Date.now()}`,
              name: doc.name || "Untitled Document",
              files: [...(doc.files || [])], // Keep existing files
            })),
          }));

          // 🔥 CRITICAL FIX: Process uploaded files with CORRECT fieldname
          if (req.files && req.files.length > 0) {
            const docFiles = req.files.filter((f) => f.fieldname === "documents");
            console.log(`📁 Found ${docFiles.length} files with fieldname 'documents'`);

            for (const file of docFiles) {
              // Extract metadata from body (frontend should send these)
              const sectionIndex = parseInt(body.documents_sectionIndex) || 0;
              const docIndex = parseInt(body.documents_docIndex) || 0;
              const docId = body.documents_docId || `doc-${sectionIndex}-${docIndex}-${Date.now()}`;
              
              console.log(`🔗 Mapping file ${file.filename} to section ${sectionIndex}, doc ${docIndex}`);

              // Ensure the section exists
              if (!processedSections[sectionIndex]) {
                processedSections[sectionIndex] = {
                  id: `section-${sectionIndex}-${Date.now()}`,
                  name: "New Section",
                  documents: []
                };
              }

              // Ensure the document exists
              if (!processedSections[sectionIndex].documents[docIndex]) {
                processedSections[sectionIndex].documents[docIndex] = {
                  id: docId,
                  name: "New Document",
                  files: []
                };
              }

              // Add the file
              processedSections[sectionIndex].documents[docIndex].files.push({
                id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: file.originalname,
                filename: file.filename,
                type: file.mimetype,
                size: file.size,
                uploadDate: new Date().toISOString(),
              });

              console.log(`✅ Added file to section ${sectionIndex}, doc ${docIndex}: ${file.filename}`);
            }
          }

          updateData.documentSections = processedSections;
          updateData.kycDocs = {}; // Clear legacy structure
        }
      } catch (err) {
        console.error("❌ Error processing documentSections:", err.message);
        // Don't fall back to previous data - use empty to avoid data loss
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

    console.log("✅ Case updated successfully");
    res.json(item);
  } catch (e) {
    console.error("❌ Error in PUT /cases/:id:", e);
    next(e);
  }
});

//
// ✅ Debug route to test file upload functionality
//
router.post("/test-upload", upload.any(), (req, res) => {
  res.json({
    success: true,
    filesProcessed: req.files?.length || 0,
    bodyKeys: Object.keys(req.body),
  });
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
    console.error("❌ Download error:", e);
    next(e);
  }
});

//
// ✅ Export properly for ESM
//
export default router;
