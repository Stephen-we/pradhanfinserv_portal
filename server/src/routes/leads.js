// server/src/routes/leads.js
import express from "express";
import Lead from "../models/Lead.js";
import Case from "../models/Case.js";
import Customer from "../models/Customer.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { listWithPagination } from "../utils/paginate.js";
import { logAction } from "../middleware/audit.js";

const router = express.Router();

/* ================================
   ✅ Debug Route
================================ */
router.get("/test", (req, res) => res.json({ ok: true }));

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

    // ✅ Log the update
    await logAction({
      req,
      action: "update_case",
      entityType: "Case",
      entityId: req.params.id,
      meta: { fields: Object.keys(req.body || {}) },
    });

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
   ✅ GET Single Lead
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
   ✅ UPDATE Lead (PUT)
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
================================ */
router.patch(
  "/:id/convert",
  auth,
  allowRoles(["admin", "superadmin", "manager", "officer"]),
  async (req, res, next) => {
    try {
      const lead = await Lead.findById(req.params.id).populate("channelPartner");
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      // ✅ Archive lead if not already
      if (lead.status !== "archived") {
        lead.status = "archived";
        await lead.save();
      }

      // ✅ CUSTOMER: reuse or create first
      let customerDoc = await Customer.findOne({ customerId: lead.leadId });
      if (!customerDoc) {
        customerDoc = await Customer.create({
          customerId: lead.leadId,
          leadId: lead._id,
          name: lead.name,
          dob: lead.dob,
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
          notes: lead.notes || "",
        });
      } else if (!customerDoc.leadId) {
        customerDoc.leadId = lead._id;
        await customerDoc.save();
      }

      // ✅ CASE: reuse or create and ensure link with Customer
      let caseDoc = await Case.findOne({ leadId: lead.leadId });

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

      if (!caseDoc) {
        caseDoc = await Case.create({
          caseId: lead.leadId,
          leadId: lead.leadId,
          leadType: lead.leadType,
          subType: lead.subType,
          channelPartner: lead.channelPartner?._id || lead.channelPartner,
          loanType: chosenLoanType,
          status: "pending-documents",
          requirementAmount: lead.requirementAmount ?? null,
          amount: null,
          bank: lead.bank || "",
          branch: lead.branch,
          customer: customerDoc._id, // ✅ LINK HERE
          customerName: lead.name,
          mobile: lead.mobile,
          email: lead.email,
          permanentAddress: lead.permanentAddress,
          currentAddress: lead.currentAddress,
          siteAddress: lead.siteAddress,
          officeAddress: lead.officeAddress,
          panNumber: lead.pan,
          aadharNumber: lead.aadhar,
          notes: lead.notes || "",
        });
      } else {
        // ✅ Ensure linked to Customer
        if (!caseDoc.customer || String(caseDoc.customer) !== String(customerDoc._id)) {
          caseDoc.customer = customerDoc._id;
        }
        // update missing info (non-breaking)
        caseDoc.leadType = caseDoc.leadType || lead.leadType;
        caseDoc.subType = caseDoc.subType || lead.subType;
        caseDoc.customerName = caseDoc.customerName || lead.name;
        caseDoc.mobile = caseDoc.mobile || lead.mobile;
        caseDoc.email = caseDoc.email || lead.email;
        if (!caseDoc.bank && lead.bank) caseDoc.bank = lead.bank;
        if (!caseDoc.branch && lead.branch) caseDoc.branch = lead.branch;
        await caseDoc.save();
      }

      console.log("✅ Case linked to Customer:", {
        caseId: caseDoc.caseId,
        customer: customerDoc._id.toString(),
      });

      await logAction({
        req,
        action: "convert_lead_to_case_customer",
        entityType: "Lead",
        entityId: lead._id,
        meta: {
          leadId: lead.leadId,
          caseId: caseDoc.caseId,
          customerId: customerDoc.customerId,
          customerObjectId: customerDoc._id,
        },
      });

      return res.json({
        message: "Lead converted successfully",
        lead,
        case: caseDoc,
        customer: customerDoc,
        caseId: caseDoc.caseId,
        customerId: customerDoc.customerId,
        leadId: lead._id,
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
