// server/src/routes/cases.js
import express from "express";
import Case from "../models/Case.js";
import CaseAudit from "../models/CaseAudit.js";
import { auth } from "../middleware/auth.js";
import { listWithPagination } from "../utils/paginate.js";
import { upload } from "../middleware/uploads.js"; // ⬅️ make sure this exists

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

    res.json(data); // { items, page, pages, total }
  } catch (e) {
    next(e);
  }
});

//
// ✅ Get single case (normalized)
//
router.get("/:id", auth, async (req, res, next) => {
  try {
    const item = await Case.findById(req.params.id).populate(
      "assignedTo",
      "name role"
    );
    if (!item) return res.status(404).json({ message: "Case not found" });

    const response = {
      ...item.toObject(),
      customerName: item.customerName || "",
      mobile: item.mobile || "",
    };

    res.json(response);
  } catch (e) {
    next(e);
  }
});

//
// ✅ Update case (JSON or multipart with KYC)
//
router.put("/:id", auth, upload.any(), async (req, res, next) => {
  try {
    const prev = await Case.findById(req.params.id);
    if (!prev) return res.status(404).json({ message: "Case not found" });

    const body = req.body || {};

    const updateData = {
      // Applicant 1
      customerName: body.customerName || body.name,
      mobile: body.mobile || body.primaryMobile,
      email: body.email,

      // Co-Applicant
      applicant2Name: body.applicant2Name,
      applicant2Mobile: body.applicant2Mobile,
      applicant2Email: body.applicant2Email,

      // Loan Details
      loanType: body.loanType,
      amount: body.amount,
      bank: body.bank,
      branch: body.branch,
      status: body.status,

      // Contact
      permanentAddress: body.permanentAddress,
      currentAddress: body.currentAddress,
      siteAddress: body.siteAddress,
      officeAddress: body.officeAddress,

      // KYC quick fields
      pan: body.pan,
      aadhar: body.aadhar,

      // Extra
      notes: body.notes,

      // Misc
      disbursedAmount: body.disbursedAmount,
      task: body.task,
    };

    // 🔹 Handle uploaded KYC files
    if (Array.isArray(req.files) && req.files.length) {
      const kyc = new Map(prev.kycDocs || []);
      for (const f of req.files) {
        if (f.fieldname.startsWith("kycDoc_")) {
          const fileUrl = f.path?.replace(/\\/g, "/");
          kyc.set(f.fieldname, fileUrl);
        }
      }
      updateData.kycDocs = kyc;
    }

    const item = await Case.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("assignedTo", "name role");

    // Audit log
    if (body.status && prev.status !== body.status) {
      await CaseAudit.create({
        case: item._id,
        actor: req.user.id,
        action: "status_changed",
        fromStatus: prev.status,
        toStatus: item.status,
      });
    } else {
      await CaseAudit.create({
        case: item._id,
        actor: req.user.id,
        action: "updated",
      });
    }

    res.json(item);
  } catch (e) {
    next(e);
  }
});

//
// ✅ Add comment
//
router.post("/:id/comment", auth, async (req, res, next) => {
  try {
    await CaseAudit.create({
      case: req.params.id,
      actor: req.user.id,
      action: "comment",
      comment: req.body.comment,
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

//
// ✅ Audit logs
//
router.get("/:id/audit", auth, async (req, res, next) => {
  try {
    const logs = await CaseAudit.find({ case: req.params.id })
      .populate("actor", "name email role")
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (e) {
    next(e);
  }
});

//
// ✅ Delete case
//
router.delete("/:id", auth, async (req, res, next) => {
  try {
    await Case.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
