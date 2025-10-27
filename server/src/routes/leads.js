// server/src/routes/leads.js
import express from "express";
import Lead from "../models/Lead.js";
import Case from "../models/Case.js";
import Customer from "../models/Customer.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { listWithPagination } from "../utils/paginate.js";
import { logAction } from "../middleware/audit.js";

// 🔐 OTP + email utilities
import { generateOTP, saveOTP, verifyOTP } from "../utils/otp.js";
import { sendEmail } from "../utils/email.js";

const router = express.Router();

/* ================================
   🔧 Config
================================ */
const OTP_EXPIRY_SECONDS = Number(process.env.OTP_EXPIRY_SECONDS || 300);

/* ================================
   🧰 Helpers
================================ */
function extractRequestMeta(req) {
  const user = req.user || {};
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.ip ||
    "unknown";
  const ua = req.headers["user-agent"] || "unknown";
  return {
    userId: user.id || user._id || null,
    userName: user.name || "",
    userEmail: user.email || "",
    userRole: user.role || "",
    ip,
    ua,
    at: new Date().toISOString(),
  };
}

/**
 * Request an export OTP (saves OTP and emails owner).
 * @param {express.Request} req
 * @param {string} purpose - unique OTP purpose key (e.g. "export_leads")
 * @param {string} title - human title for the email subject/body
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function requestExportOtp(req, purpose, title = "Export") {
  const meta = extractRequestMeta(req);
  const code = generateOTP(6);
  saveOTP({ purpose, identifier: "owner", code, ttlSeconds: OTP_EXPIRY_SECONDS });

  const lines = [
    `Your OTP for ${title} is: ${code}`,
    ``,
    `Requester: ${meta.userName || "-"} (${meta.userEmail || "-"})`,
    `Role: ${meta.userRole || "-"}`,
    `User ID: ${meta.userId || "-"}`,
    `IP: ${meta.ip}`,
    `User-Agent: ${meta.ua}`,
    `Time (UTC): ${meta.at}`,
    ``,
    `Valid for ${Math.floor(OTP_EXPIRY_SECONDS / 60)} minutes.`,
  ].join("\n");

  const ownerEmail = process.env.OWNER_EMAIL;
  if (ownerEmail) {
    await sendEmail(ownerEmail, `${title} OTP`, lines);
  }

  // audit
  await logAction({
    req,
    action: "export_request_otp",
    entityType: "Lead",
    entityId: null,
    meta: { purpose, ...meta },
  });

  return { ok: true, message: "OTP sent to owner's email." };
}

/**
 * Verify an export OTP
 * @param {string} purpose
 * @param {string|number} otp
 * @returns {{ok: boolean, message?: string}}
 */
function verifyExportOtp(purpose, otp) {
  const v = verifyOTP({
    purpose,
    identifier: "owner",
    code: String(otp || ""),
  });
  if (!v.ok) {
    const map = {
      not_found: "OTP not found",
      expired: "OTP expired",
      mismatch: "Invalid OTP",
    };
    return { ok: false, message: map[v.reason] || "OTP verification failed" };
  }
  return { ok: true };
}

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
      { page, limit, sort: { createdAt: -1 } },
      { path: "assignedTo", select: "name role" }
    );

    // audit (list only – keep lightweight)
    await logAction({
      req,
      action: "list_leads",
      entityType: "Lead",
      entityId: null,
      meta: { q: q || "", status: status || "", page, limit },
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

    await logAction({
      req,
      action: "create_lead",
      entityType: "Lead",
      entityId: lead._id,
      meta: {},
    });

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

    await logAction({
      req,
      action: "view_lead",
      entityType: "Lead",
      entityId: lead._id,
      meta: {},
    });

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

    await logAction({
      req,
      action: "update_lead",
      entityType: "Lead",
      entityId: updated._id,
      meta: { fields: Object.keys(req.body || {}) },
    });

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

    await logAction({
      req,
      action: "patch_lead",
      entityType: "Lead",
      entityId: updated._id,
      meta: { fields: Object.keys(req.body || {}) },
    });

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

    await logAction({
      req,
      action: "delete_lead",
      entityType: "Lead",
      entityId: deleted._id,
      meta: {},
    });

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

      // Archive lead if not already
      if (lead.status !== "archived") {
        lead.status = "archived";
        await lead.save();
      }

      // CUSTOMER: reuse or create first
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

      // CASE: reuse or create and ensure link with Customer
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
          customer: customerDoc._id, // link
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
        // Ensure linked to Customer + fill missing info
        if (!caseDoc.customer || String(caseDoc.customer) !== String(customerDoc._id)) {
          caseDoc.customer = customerDoc._id;
        }
        caseDoc.leadType = caseDoc.leadType || lead.leadType;
        caseDoc.subType = caseDoc.subType || lead.subType;
        caseDoc.customerName = caseDoc.customerName || lead.name;
        caseDoc.mobile = caseDoc.mobile || lead.mobile;
        caseDoc.email = caseDoc.email || lead.email;
        if (!caseDoc.bank && lead.bank) caseDoc.bank = lead.bank;
        if (!caseDoc.branch && lead.branch) caseDoc.branch = lead.branch;
        await caseDoc.save();
      }

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

/* ================================
   ✅ Export: Request OTP (with requester identity & IP/UA)
================================ */
router.post("/export/request-otp", auth, async (req, res, next) => {
  try {
    const result = await requestExportOtp(req, "export_leads", "Leads Export");
    res.json(result);
  } catch (e) {
    console.error("❌ leads export request-otp error:", e);
    next(e);
  }
});

/* ================================
   ✅ Export: Verify OTP and return data
================================ */
router.post("/export/verify", auth, async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP required." });

    const check = verifyExportOtp("export_leads", otp);
    if (!check.ok) return res.status(401).json({ message: check.message });

    // Export fields (adjust as needed)
    const items = await Lead.find()
      .populate("assignedTo", "name email")
      .select("leadId name mobile email leadType subType workflowStatus status assignedTo createdAt");

    await logAction({
      req,
      action: "export_verify_ok",
      entityType: "Lead",
      entityId: null,
      meta: extractRequestMeta(req),
    });

    res.json({ ok: true, items });
  } catch (e) {
    console.error("❌ leads export verify error:", e);
    next(e);
  }
});

export default router;
