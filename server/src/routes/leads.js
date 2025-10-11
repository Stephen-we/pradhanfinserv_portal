import express from "express";
import Lead from "../models/Lead.js";
import Case from "../models/Case.js";
import Customer from "../models/Customer.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { listWithPagination } from "../utils/paginate.js";

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

      // ✅ CASE: reuse or create
      let caseDoc = await Case.findOne({ leadId: lead.leadId });
      if (!caseDoc) {
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
          caseId: lead.leadId,
          leadId: lead.leadId,
          leadType: lead.leadType,
          subType: lead.subType,
          channelPartner: lead.channelPartner?._id || lead.channelPartner,
          loanType: chosenLoanType,
          status: "Pending",
          requirementAmount: lead.requirementAmount ?? null,
          amount: null, // sanctioned left empty initially
          bank: lead.bank || "",
          branch: lead.branch,
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
      }

      // ✅ CUSTOMER: reuse or create
      let customerDoc = await Customer.findOne({ customerId: lead.leadId });
      if (!customerDoc) {
        customerDoc = await Customer.create({
          customerId: lead.leadId,
          leadId: lead._id, // ✅ Link the original lead
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
      } else {
        // ✅ Update missing link for existing customer
        if (!customerDoc.leadId) {
          customerDoc.leadId = lead._id;
          await customerDoc.save();
        }
      }

      console.log("✅ Customer linked to Lead:", customerDoc.leadId);

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
