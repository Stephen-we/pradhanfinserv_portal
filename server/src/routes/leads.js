// server/src/routes/leads.js
import express from "express";
import Lead from "../models/Lead.js";
import Case from "../models/Case.js";
import Customer from "../models/Customer.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { listWithPagination } from "../utils/paginate.js";

const router = express.Router();

/* ================================
   ✅ Debug Route (for testing only)
================================ */
router.get("/test", (req, res) => res.json({ ok: true }));

/* ================================
   ✅ LIST Leads (with pagination & filters)
   Example: GET /api/leads?page=1&q=&status=free_pool
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
   ✅ CREATE Lead
================================ */
router.post("/", auth, async (req, res, next) => {
  try {
    const lead = new Lead(req.body);
    await lead.save();
    res.status(201).json(lead);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ GET Single Lead (with population)
================================ */
router.get("/:id", auth, async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo", "name email role")
      .populate("channelPartner", "name contact email");

    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(lead);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ UPDATE Lead (Full)
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
   ✅ PATCH Lead (Partial Update)
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
   ✅ CONVERT Lead → Archived + Case + Customer
   - Uses the SAME ID: customerId = lead.leadId
   - Saves channelPartner/bank/branch/status for Customer
   - Idempotent (won’t create duplicates if re-run)
================================ */router.patch(
  "/:id/convert",
  auth,
  allowRoles(["admin", "superadmin", "manager", "officer"]),
  async (req, res, next) => {
    try {
      const lead = await Lead.findById(req.params.id).populate("channelPartner");
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      // Always archive the lead
      if (lead.status !== "archived") {
        lead.status = "archived";
        await lead.save();
      }

      // ✅ CASE: reuse if already created
      let caseDoc = await Case.findOne({ leadId: lead.leadId });
      if (!caseDoc) {
        // Ensure valid loan type
        const validLoanTypes = [
          "Home Loan",
          "Personal Loan",
          "Business Loan",
          "Education Loan",
          "Vehicle Loan",
          "LAP",
          "MSME",
          "LRD",
        ];
        let chosenLoanType = lead.subType;
        if (!validLoanTypes.includes(chosenLoanType)) chosenLoanType = "Home Loan";

        caseDoc = await Case.create({
          caseId: lead.leadId,           // same id as lead
          leadId: lead.leadId,

          // NEW
          leadType: lead.leadType,
          subType: lead.subType,

          loanType: chosenLoanType,
          status: "Pending",
          amount: lead.requirementAmount,
          bank: lead.bank || "",
          branch: lead.branch,
          customerName: lead.name,
          mobile: lead.mobile,
          email: lead.email,
          permanentAddress: lead.permanentAddress,
          currentAddress: lead.currentAddress,
          siteAddress: lead.siteAddress,
          officeAddress: lead.officeAddress,
          pan: lead.pan,
          aadhar: lead.aadhar,
          notes: lead.notes || "",
        });
      }

      // ✅ CUSTOMER: reuse if already created
      let customerDoc = await Customer.findOne({ customerId: lead.leadId });
      if (!customerDoc) {
        customerDoc = await Customer.create({
          customerId: lead.leadId,
          name: lead.name,
          mobile: lead.mobile,
          email: lead.email,

          channelPartner: lead.channelPartner?.name || "",
          bankName: lead.bank || "",
          branch: lead.branch || "",
          status: "open",

          kyc: {
            pan: lead.pan || "",
            aadhar: lead.aadhar || "",
            files: [],
          },

          address: {
            permanent: { line1: lead.permanentAddress || "" },
            correspondence: { line1: lead.currentAddress || "" },
          },

          logNotes: lead.notes || "",
        });
      }

      return res.json({
        message: "Lead converted successfully",
        lead,
        case: caseDoc,
        customer: customerDoc,
        caseId: caseDoc.caseId,
        customerId: customerDoc.customerId,
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
