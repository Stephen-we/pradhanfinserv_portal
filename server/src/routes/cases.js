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

    // Normalize kycDocs (for backward compatibility)
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

    // ✅ Ensure documentSections is properly structured (for new structure)
    if (caseObj.documentSections && Array.isArray(caseObj.documentSections)) {
      caseObj.documentSections = caseObj.documentSections.map(section => ({
        ...section,
        documents: section.documents?.map(doc => ({
          ...doc,
          files: doc.files || []
        })) || []
      }));
    }

    res.json(caseObj);
  } catch (e) {
    next(e);
  }
});

//
// ✅ Update case with support for both KYC docs and documentSections
// FIXED: Uses upload.any() explicitly to handle any file field names
//
router.put("/:id", auth, upload.any(), async (req, res, next) => {
  try {
    console.log("=== CASE UPDATE REQUEST ===");
    console.log("🔎 req.body keys:", Object.keys(req.body));
    console.log("🔎 req.files count:", req.files?.length || 0);
    console.log("🔎 documentSections in body:", !!req.body.documentSections);

    // Enhanced file logging
    if (req.files && req.files.length > 0) {
      console.log("✅ FILES SUCCESSFULLY UPLOADED VIA MULTER:");
      req.files.forEach((file, index) => {
        console.log(`  📄 File ${index}: ${file.fieldname} -> ${file.filename} (${file.size} bytes)`);
      });
    } else {
      console.log("❌ No files processed by multer - checking for issues...");
      
      // Check if there are doc_* fields in body (indicating files were sent but not processed)
      const docFieldsInBody = Object.keys(req.body).filter(key => key.startsWith('doc_'));
      if (docFieldsInBody.length > 0) {
        console.log(`⚠️ Found ${docFieldsInBody.length} doc_* fields in req.body but no files in req.files`);
        console.log("🔧 Possible issues:");
        console.log("   - Frontend is setting Content-Type header manually");
        console.log("   - File size exceeds limits");
        console.log("   - Multer configuration issue");
      }
    }

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
      amount: body.amount && body.amount !== "null" ? Number(body.amount) : undefined,
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

    // 🔹 Handle NEW documentSections structure
    if (body.documentSections) {
      try {
        const documentSections = JSON.parse(body.documentSections);
        console.log("📁 Processing documentSections:", documentSections?.length);
        
        if (Array.isArray(documentSections)) {
          const processedSections = [];
          let totalNewFiles = 0;

          for (const section of documentSections) {
            const processedSection = {
              id: section.id || Date.now() + Math.random(),
              name: section.name || "Untitled Section",
              documents: []
            };

            for (const doc of section.documents || []) {
              const processedDoc = {
                id: doc.id || Date.now() + Math.random(),
                name: doc.name || "Untitled Document",
                files: [...(doc.files || [])] // Start with existing files
              };

              processedSection.documents.push(processedDoc);
            }

            processedSections.push(processedSection);
          }

          // Process uploaded files and add them to appropriate documents
          if (req.files && req.files.length > 0) {
            console.log(`📄 Processing ${req.files.length} uploaded files`);
            
            // Process doc_* files (new structure)
            const docFiles = req.files.filter(f => f.fieldname.startsWith('doc_'));
            console.log(`📊 Found ${docFiles.length} doc_* files`);

            for (const file of docFiles) {
              const fileName = path.basename(file.path);
              
              // Parse fieldname pattern: doc_sectionIndex_docIndex_fileIndex
              const parts = file.fieldname.split('_');
              if (parts.length >= 4) {
                const sectionIndex = parseInt(parts[1]);
                const docIndex = parseInt(parts[2]);
                
                if (processedSections[sectionIndex]?.documents[docIndex]) {
                  processedSections[sectionIndex].documents[docIndex].files.push({
                    id: Date.now() + Math.random(),
                    name: file.originalname,
                    filename: fileName,
                    type: file.mimetype,
                    size: file.size,
                    uploadDate: new Date().toISOString()
                  });
                  totalNewFiles++;
                  console.log(`✅ Added file to section ${sectionIndex}, doc ${docIndex}: ${fileName}`);
                } else {
                  console.warn(`❌ Could not find section ${sectionIndex}, doc ${docIndex} for file: ${fileName}`);
                }
              } else {
                console.warn(`❌ Invalid fieldname format: ${file.fieldname}`);
              }
            }

            // Process any kycDoc_* files (old structure) as fallback
            const kycFiles = req.files.filter(f => f.fieldname.startsWith('kycDoc_'));
            if (kycFiles.length > 0) {
              console.log(`📦 Processing ${kycFiles.length} kycDoc_* files as fallback`);
              
              // Convert kycDoc files to new structure in first section
              if (processedSections[0]?.documents[0]) {
                for (const file of kycFiles) {
                  const fileName = path.basename(file.path);
                  processedSections[0].documents[0].files.push({
                    id: Date.now() + Math.random(),
                    name: file.originalname,
                    filename: fileName,
                    type: file.mimetype,
                    size: file.size,
                    uploadDate: new Date().toISOString()
                  });
                  totalNewFiles++;
                  console.log(`✅ Added kycDoc file to first document: ${fileName}`);
                }
              }
            }
          } else {
            console.log("💡 No new files to process in this update");
          }

          updateData.documentSections = processedSections;
          console.log(`✅ Processed ${processedSections.length} document sections with ${totalNewFiles} new files`);
        }
      } catch (parseError) {
        console.error("❌ Error parsing documentSections:", parseError);
        // Continue without documentSections if parsing fails
      }
    }

    // 🔹 Handle OLD kycDocs structure (backward compatibility) - only if no documentSections
    if (!body.documentSections) {
      console.log("📁 Processing legacy kycDocs structure");
      const existingKyc = prev.kycDocs || {};
      const kyc = { ...existingKyc };

      if (Array.isArray(req.files) && req.files.length) {
        for (const f of req.files) {
          if (f.fieldname.startsWith("kycDoc_")) {
            const fileName = path.basename(f.path);
            if (!kyc[f.fieldname]) kyc[f.fieldname] = [];
            // Remove duplicates and add new file
            kyc[f.fieldname] = [...new Set([...kyc[f.fieldname], fileName])];
            console.log(`✅ Added kycDoc file: ${fileName} to ${f.fieldname}`);
          }
        }
      }
      updateData.kycDocs = kyc;
    }

    // Remove old kycDocs if using new structure to avoid duplication
    if (body.documentSections) {
      updateData.kycDocs = {};
    }

    console.log("📦 Final update data summary:");
    console.log(`   - documentSections: ${updateData.documentSections?.length || 0} sections`);
    if (updateData.documentSections) {
      const totalFiles = updateData.documentSections.reduce((total, section) => 
        total + section.documents.reduce((docTotal, doc) => 
          docTotal + (doc.files ? doc.files.length : 0), 0
        ), 0
      );
      console.log(`   - Total files in documentSections: ${totalFiles}`);
    }

    const item = await Case.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("assignedTo", "name role");

    // Audit log
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
  console.log("=== FILE UPLOAD TEST ===");
  console.log("Content-Type:", req.headers['content-type']);
  console.log("req.files count:", req.files?.length || 0);
  console.log("req.body keys:", Object.keys(req.body));
  
  if (req.files && req.files.length > 0) {
    console.log("✅ Files successfully processed:");
    req.files.forEach((file, index) => {
      console.log(`  File ${index}: ${file.fieldname} -> ${file.filename} (${file.size} bytes)`);
    });
  } else {
    console.log("❌ No files processed by multer");
  }
  
  res.json({
    success: true,
    message: "Upload test completed",
    filesProcessed: req.files?.length || 0,
    bodyKeys: Object.keys(req.body)
  });
});

//
// ✅ Download all documents as ZIP - supports both structures
//
router.get("/:id/download", auth, async (req, res, next) => {
  try {
    const caseObj = await Case.findById(req.params.id);
    if (!caseObj) return res.status(404).json({ message: "Case not found" });

    const folderName = caseObj.customerName || caseObj.caseId || "case_documents";
    res.attachment(`${folderName}_documents.zip`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    let fileCount = 0;

    // ✅ Handle NEW documentSections structure
    if (caseObj.documentSections && Array.isArray(caseObj.documentSections)) {
      console.log(`📁 Processing ${caseObj.documentSections.length} document sections`);

      for (const section of caseObj.documentSections) {
        const sectionName = section.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Unnamed_Section";
        
        for (const doc of section.documents || []) {
          const docName = doc.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Unnamed_Document";
          
          for (const file of doc.files || []) {
            const filename = file.filename || file.name;
            if (filename) {
              // ✅ Absolute path
              const filePath = path.join(process.cwd(), "server", "uploads", filename);
              if (fs.existsSync(filePath)) {
                const zipPath = `${sectionName}/${docName}/${filename}`;
                archive.file(filePath, { name: zipPath });
                fileCount++;
                console.log(`✅ Added: ${zipPath}`);
              } else {
                console.warn(`⚠️ File missing: ${filePath}`);
              }
            }
          }
        }
      }
    }

    // ✅ Handle OLD kycDocs structure (backward compatibility)
    if (fileCount === 0) {
      console.log("📁 Processing legacy kycDocs structure");
      const kycDocs =
        caseObj.kycDocs instanceof Map
          ? Object.fromEntries(caseObj.kycDocs)
          : caseObj.kycDocs || {};

      const docNames = [
        "Photo_4_each_A_and_C",
        "PAN_Self_attested_A_and_C",
        "Aadhar_self_attested_A_and_C",
        "Address_Proof_Resident_and_Shop_Company",
        "Shop_Act_Company_Registration_Company_PAN",
        "Bank_statement_last_12_months_CA_and_SA",
        "GST_Trade_Professional_Certificate",
        "Udyam_Registration_Certificate",
        "ITR_last_3_years_Computation_P_L_Balance_Sheet",
        "Marriage_Certificate_if_required",
        "Partnership_Deed_if_required",
        "MOA_and_AOA_Company_Registration",
        "Form_26AS_Last_3_Years",
      ];

      Object.entries(kycDocs).forEach(([fieldName, files]) => {
        const fileArray = Array.isArray(files) ? files : [files].filter(Boolean);
        const docIndex = parseInt(fieldName.replace('kycDoc_', ''));
        const docName = docNames[docIndex] || `Document_${docIndex}`;

        fileArray.forEach((file) => {
          // ✅ Absolute path
          const filePath = path.join(process.cwd(), "server", "uploads", file);
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: `KYC_Documents/${docName}/${file}` });
            fileCount++;
            console.log(`✅ Added: KYC_Documents/${docName}/${file}`);
          } else {
            console.warn(`⚠️ File missing: ${filePath}`);
          }
        });
      });
    }

    if (fileCount === 0) {
      return res.status(404).json({ message: "No documents found to download" });
    }

    console.log(`✅ Total files added to ZIP: ${fileCount}`);
    
    archive.on('error', (err) => {
      console.error('❌ Archive error:', err);
      res.status(500).json({ message: "Failed to create archive" });
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('⚠️ Archive warning:', err);
      } else {
        throw err;
      }
    });

    archive.finalize();
  } catch (e) {
    console.error('❌ Download error:', e);
    next(e);
  }
});

export default router;