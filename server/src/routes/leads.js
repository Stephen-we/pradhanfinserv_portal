// server/src/routes/leads.js
import express from "express";
import Lead from "../models/Lead.js";
import Case from "../models/Case.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { listWithPagination } from "../utils/paginate.js";

const router = express.Router();

/* ================================
   ✅ CREATE Lead
================================ */
router.post("/", auth, async (req, res, next) => {
  try {
    const lead = new Lead(req.body); // includes all fields
    await lead.save();
    res.status(201).json(lead);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ LIST Leads (with pagination & filters)
================================ */
router.get("/", auth, async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10, status } = req.query;

    const cond = {};
    if (q) {
      cond.$or = [
        { name: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { leadId: { $regex: q, $options: "i" } },
      ];
    }
    if (status) cond.status = status;

    const data = await listWithPagination(
      Lead,
      cond,
      { page, limit },
      { path: "assignedTo", select: "name role" }
    );

    res.json(data);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ GET Single Lead
================================ */
router.get("/:id", auth, async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id).populate("assignedTo", "name role");
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(lead);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ PUT Lead (Full Update)
================================ */
router.put("/:id", auth, async (req, res, next) => {
  try {
    const updated = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Lead not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ PATCH Lead (Partial Update) - NEW ROUTE
================================ */
router.patch("/:id", auth, async (req, res, next) => {
  try {
    const updated = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Lead not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ DELETE Lead
================================ */
router.delete("/:id", auth, async (req, res, next) => {
  try {
    const deleted = await Lead.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Lead not found" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ CONVERT Lead → Archived + Case
================================ */
router.patch(
  "/:id/convert",
  auth,
  allowRoles(["admin", "superadmin", "manager", "officer"]),
  async (req, res, next) => {
    try {
      const lead = await Lead.findById(req.params.id);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      // Already has case?
      const existingCase = await Case.findOne({ leadId: lead.leadId });
      if (existingCase) {
        return res.json({
          message: "Case already exists for this lead",
          lead,
          case: existingCase,
        });
      }

      // Move to archived
      lead.status = "archived";
      await lead.save();

      // Ensure valid loan type
      const validLoanTypes = [
        "Home Loan", "Personal Loan", "Business Loan", "Education Loan",
        "Vehicle Loan", "LAP", "MSME", "LRD"
      ];
      let chosenLoanType = lead.subType;
      if (!validLoanTypes.includes(chosenLoanType)) {
        chosenLoanType = "Home Loan";
      }

      // Create case (carry forward all details)
      const newCase = await Case.create({
        caseId: lead.leadId,
        leadId: lead.leadId,
        loanType: chosenLoanType,
        status: "Pending",
        amount: lead.requirementAmount,
        bank: "",
        branch: lead.branch,

        // Applicant
        customerName: lead.name,
        mobile: lead.mobile,
        email: lead.email,

        // Contact
        permanentAddress: lead.permanentAddress,
        currentAddress: lead.currentAddress,
        siteAddress: lead.siteAddress,
        officeAddress: lead.officeAddress,

        // KYC
        pan: lead.pan,
        aadhar: lead.aadhar,

        // Notes
        notes: lead.notes || "",
      });

      res.json({
        message: "Lead converted successfully",
        lead,
        case: newCase,
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;