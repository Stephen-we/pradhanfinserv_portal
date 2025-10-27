//server/src/routes/customers.js
import express from "express";
import Customer from "../models/Customer.js";
import Case from "../models/Case.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { upload } from "../middleware/uploads.js";
import { listWithPagination as paginateCustomers } from "../utils/paginate_customers.js";
import { logAction } from "../middleware/audit.js";

const router = express.Router();

/* ================================
   ✅ AUTO UPDATE CASES BASED ON CUSTOMER STATUS - SIMPLIFIED & FIXED
================================ */
async function autoUpdateCasesForCustomer(customerId, newStatus, req) {
  try {
    console.log(`🔄 Auto-updating cases for customer: ${customerId}, new status: ${newStatus}`);
    
    // Find the customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      console.log("❌ Customer not found");
      return { modifiedCount: 0 };
    }

    console.log(`📋 Customer found: ${customer.name} (${customer.customerId})`);

    // 🔥 FIND CASES BY CUSTOMER NAME & MOBILE (since direct link might not exist)
    // This is the most reliable way to link cases to customers
    const cases = await Case.find({
      $or: [
        { customerName: customer.name },
        { customer: customerId },
        { customerId: customer.customerId }
      ]
    });

    console.log(`🔍 Found ${cases.length} cases for customer ${customer.name}`);

    let caseUpdate = {};
    let action = "";
    let reason = "";

    // Determine case updates based on customer status
    const status = newStatus.toLowerCase();
    
    if (status === "close" || status === "closed") {
      caseUpdate = { 
        status: "complete", 
        task: "Complete" 
      };
      action = "auto_close_cases";
      reason = "Customer marked as closed";
    } else if (status === "open") {
      caseUpdate = { 
        status: "pending-documents", 
        task: "In-progress",
        disbursedAmount: 0 // 🔥 RESET disbursed amount to zero when reopening
      };
      action = "auto_reopen_cases";
      reason = "Customer reopened";
    }

    console.log(`📋 Case update to apply:`, caseUpdate);

    // If we have updates to make and cases found
    if (Object.keys(caseUpdate).length > 0 && cases.length > 0) {
      // Get all case IDs to update
      const caseIds = cases.map(c => c._id);
      
      // Update all matching cases
      const result = await Case.updateMany(
        { _id: { $in: caseIds } },
        { $set: caseUpdate }
      );

      console.log(`✅ Update result: ${result.modifiedCount} cases modified, ${result.matchedCount} cases matched`);

      // Log the action if cases were updated
      if (result.modifiedCount > 0) {
        console.log(`✅ ${result.modifiedCount} loan cases updated for customer ${customer.name}`);

        await logAction({
          req,
          action: action,
          entityType: "Case",
          entityId: customerId,
          meta: {
            customerName: customer.name,
            customerId: customer.customerId,
            affectedCases: result.modifiedCount,
            reason: reason,
            caseUpdates: caseUpdate
          },
        });

        // 🔥 ALSO UPDATE CUSTOMER DISBURSEMENTS IF REOPENING
        if (status === "open") {
          // Reset customer disbursements if needed
          await Customer.findByIdAndUpdate(customerId, {
            $set: { 
              disbursements: [] // Clear disbursements when reopening
            }
          });
          console.log(`💰 Customer disbursements reset for ${customer.name}`);
        }
      } else {
        console.log("⚠️ No cases were updated. Cases might already have target status.");
      }

      return result;
    } else {
      console.log("ℹ️ No cases found to update or no status change needed");
    }

    return { modifiedCount: 0 };
  } catch (error) {
    console.error("❌ Error auto-updating cases:", error);
    return { modifiedCount: 0 };
  }
}

/* ================================
   ✅ UPDATE Customer (PATCH & PUT) - FIXED
================================ */
async function updateCustomer(req, res, next) {
  try {
    const item = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: "Customer not found" });

    await logAction({
      req,
      action: "update_customer",
      entityType: "Customer",
      entityId: item._id,
      meta: {
        customerId: item.customerId,
        name: item.name,
        updatedFields: Object.keys(req.body),
      },
    });

    /* ---------------------------------------------
       🧠 Auto Behavior: when status changes
    --------------------------------------------- */
    if (req.body.status !== undefined) {
      console.log(`🔄 Customer status changed to: ${req.body.status}, triggering case updates...`);
      // Auto-update related cases based on customer status change
      await autoUpdateCasesForCustomer(item._id, req.body.status, req);
    }

    res.json(item);
  } catch (e) {
    console.error("❌ Error in updateCustomer:", e);
    next(e);
  }
}

/* ================================
   ✅ CREATE Customer
================================ */
router.post("/", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
  try {
    const item = new Customer(req.body);
    await item.save();

    await logAction({
      req,
      action: "create_customer",
      entityType: "Customer",
      entityId: item._id,
      meta: { customerId: item.customerId, name: item.name },
    });

    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ LIST Customers (Search + Pagination + Filters)
================================ */
router.get("/", auth, async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10, bank, status } = req.query;
    const searchQuery = {};

    if (q) {
      searchQuery.$or = [
        { name: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { customerId: { $regex: q, $options: "i" } },
      ];
    }
    if (bank && bank.trim() !== "") searchQuery.bankName = bank;
    if (status && status.trim() !== "") searchQuery.status = status;

    const data = await paginateCustomers(Customer, searchQuery, { page, limit }, [
      { path: "channelPartner", select: "name email contact" },
    ]);

    res.json(data);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ META: Banks & Statuses
================================ */
router.get("/meta/banks", auth, async (req, res, next) => {
  try {
    const banks = await Customer.distinct("bankName", { bankName: { $nin: [null, ""] } });
    const sorted = banks.filter(b => typeof b === "string" && b.trim() !== "").sort();
    res.json(sorted);
  } catch (e) {
    next(e);
  }
});

router.get("/meta/statuses", auth, async (req, res, next) => {
  try {
    const statuses = await Customer.distinct("status", { status: { $ne: null, $ne: "" } });
    const all = [...new Set([...statuses, "open", "close"])].filter(s => s && s.trim() !== "").sort();
    res.json(all);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ GET Single Customer
================================ */
router.get("/:id", auth, async (req, res, next) => {
  try {
    const item = await Customer.findById(req.params.id).populate("channelPartner", "name email contact");
    if (!item) return res.status(404).json({ message: "Customer not found" });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", auth, allowRoles(["admin", "superadmin"]), updateCustomer);
router.put("/:id", auth, allowRoles(["admin", "superadmin"]), updateCustomer);

/* ================================
   ✅ PROFILE PHOTO & KYC
================================ */
router.post("/:id/photo", auth, upload.single("photo"), async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    customer.photo = `/uploads/${req.file.filename}`;
    await customer.save();

    await logAction({
      req,
      action: "upload_photo",
      entityType: "Customer",
      entityId: customer._id,
      meta: { customerId: customer.customerId, name: customer.name },
    });

    res.json({ ok: true, photo: customer.photo });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id/photo", auth, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    customer.photo = null;
    await customer.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/kyc/upload", auth, upload.single("file"), async (req, res, next) => {
  try {
    const item = await Customer.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Customer not found" });

    if (!item.kyc) item.kyc = { files: [] };
    item.kyc.files.push({
      label: req.body.label || "KYC",
      path: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
    });
    await item.save();

    res.json({ ok: true, file: item.kyc.files[item.kyc.files.length - 1] });
  } catch (e) {
    next(e);
  }
});

/* ================================
   💰 DISBURSEMENTS
================================ */
router.post("/:id/disbursements", auth, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const disb = { amount: req.body.amount, date: req.body.date || new Date(), notes: req.body.notes || "" };
    customer.disbursements.push(disb);
    await customer.save();

    await logAction({
      req,
      action: "add_disbursement",
      entityType: "Customer",
      entityId: customer._id,
      meta: { customerId: customer.customerId, name: customer.name, amount: disb.amount },
    });

    res.status(201).json(disb);
  } catch (e) {
    next(e);
  }
});

router.get("/:id/disbursements", auth, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer.disbursements || []);
  } catch (e) {
    next(e);
  }
});

router.put("/:id/disbursements/:disbId", auth, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    const disbursement = customer.disbursements.id(req.params.disbId);
    if (!disbursement) return res.status(404).json({ message: "Disbursement not found" });

    if (req.body.amount !== undefined) disbursement.amount = req.body.amount;
    if (req.body.date) disbursement.date = req.body.date;
    if (req.body.notes) disbursement.notes = req.body.notes;

    await customer.save();
    res.json({ ok: true, disbursement });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id/disbursements/:disbId", auth, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    customer.disbursements = customer.disbursements.filter(d => d._id.toString() !== req.params.disbId);
    await customer.save();

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ✅ Export: Request OTP
//
router.post("/export/request-otp", auth, async (req, res, next) => {
  try {
    const result = await requestExportOtp(req, "export_leads");
    res.json(result);
  } catch (e) {
    next(e);
  }
});

//
// ✅ Export: Verify OTP and Download Data
//
router.post("/export/verify", auth, async (req, res, next) => {
  try {
    const { otp } = req.body;
    const check = await verifyExportOtp("export_leads", otp);
    if (!check.ok) return res.status(401).json({ message: check.message });

    const items = await Lead.find().select("leadId name mobile loanType status createdAt");
    res.json({ ok: true, items });
  } catch (e) {
    next(e);
  }
});

export default router;