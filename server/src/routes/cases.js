// server/src/routes/cases.js
import express from "express";
import Case from "../models/Case.js";
import CaseAudit from "../models/CaseAudit.js";
import { auth } from "../middleware/auth.js";
import { listWithPagination } from "../utils/paginate.js";

const router = express.Router();

// ✅ List with pagination
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

// ✅ Get single case (normalized)
router.get("/:id", auth, async (req, res, next) => {
  try {
    const item = await Case.findById(req.params.id).populate("assignedTo", "name role");
    if (!item) return res.status(404).json({ message: "Case not found" });

    // normalize response for frontend
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

// ✅ Create new case
router.post("/", auth, async (req, res, next) => {
  try {
    const last = await Case.findOne().sort({ createdAt: -1 });
    const nextId =
      last && last.caseId
        ? (parseInt(last.caseId, 10) + 1).toString()
        : "25040001";

    const item = await Case.create({ ...req.body, caseId: nextId });

    await CaseAudit.create({
      case: item._id,
      actor: req.user.id,
      action: "created",
    });

    const populated = await Case.findById(item._id).populate("assignedTo", "name role");
    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
});

// ✅ Update case (with mapping)
router.put("/:id", auth, async (req, res, next) => {
  try {
    const prev = await Case.findById(req.params.id);

    const updateData = {
      // Applicant 1
      customerName: req.body.customerName || req.body.name,
      mobile: req.body.mobile || req.body.primaryMobile,
      email: req.body.email,

      // Co-Applicant
      applicant2Name: req.body.applicant2Name,
      applicant2Mobile: req.body.applicant2Mobile,
      applicant2Email: req.body.applicant2Email,

      // Loan Details
      loanType: req.body.loanType,
      amount: req.body.amount,
      bank: req.body.bank,
      branch: req.body.branch,
      status: req.body.status,

      // Contact
      permanentAddress: req.body.permanentAddress,
      currentAddress: req.body.currentAddress,
      siteAddress: req.body.siteAddress,
      officeAddress: req.body.officeAddress,

      // KYC
      pan: req.body.pan,
      aadhar: req.body.aadhar,

      // Extra
      notes: req.body.notes,

      // Misc
      disbursedAmount: req.body.disbursedAmount,
      task: req.body.task,
    };

    const item = await Case.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("assignedTo", "name role");

    if (!item) return res.status(404).json({ message: "Case not found" });

    // Audit log
    if (req.body.status && prev.status !== req.body.status) {
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

// ✅ Add comment
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

// ✅ Audit logs
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

// ✅ Delete case
router.delete("/:id", auth, async (req, res, next) => {
  try {
    await Case.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
