// server/src/routes/customer.js
import express from "express";
import Customer from "../models/Customer.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { upload } from "../middleware/uploads.js";
import { listWithPagination as paginateCustomers } from "../utils/paginate_customers.js";
import { logAction } from "../middleware/audit.js";

const router = express.Router();

/* ================================
   ✅ LIST Customers (Search + Pagination + Filters)
================================ */
router.get("/", auth, async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10, bank, status } = req.query;

    const searchQuery = {};

    // 🔍 Text search
    if (q) {
      searchQuery.$or = [
        { name: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { customerId: { $regex: q, $options: "i" } },
      ];
    }

    // 🏦 Bank filter
    if (bank && bank.trim() !== "") {
      searchQuery.bankName = bank;
    }

    // 📊 Status filter
    if (status && status.trim() !== "") {
      searchQuery.status = status;
    }

    const data = await paginateCustomers(Customer, searchQuery, { page, limit }, [
      { path: "channelPartner", select: "name email contact" },
    ]);

    res.json(data);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ GET Available Banks (Fixed)
================================ */
router.get("/meta/banks", auth, async (req, res, next) => {
  try {
    // ✅ Use $nin to exclude null and empty values correctly
    const banks = await Customer.distinct("bankName", {
      bankName: { $nin: [null, ""] },
    });

    // ✅ Sort and clean the list
    const sortedBanks = banks
      .filter((b) => typeof b === "string" && b.trim() !== "")
      .sort((a, b) => a.localeCompare(b));

    res.json(sortedBanks);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ GET Available Status Options
================================ */
router.get("/meta/statuses", auth, async (req, res, next) => {
  try {
    const statuses = await Customer.distinct("status", {
      status: { $ne: null, $ne: "" },
    });

    const allStatuses = [...new Set([...statuses, "open", "close"])]
      .filter((status) => status && status.trim() !== "")
      .sort();

    res.json(allStatuses);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ GET Single Customer
================================ */
router.get("/:id", auth, async (req, res, next) => {
  try {
    const item = await Customer.findById(req.params.id).populate(
      "channelPartner",
      "name email contact"
    );
    if (!item) return res.status(404).json({ message: "Customer not found" });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

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
   ✅ UPDATE Customer (PATCH)
================================ */
router.patch("/:id", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
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

    res.json(item);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ UPDATE Customer (PUT - full update)
================================ */
router.put("/:id", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
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

    res.json(item);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ DELETE Customer
================================ */
router.delete("/:id", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    await Customer.findByIdAndDelete(req.params.id);

    await logAction({
      req,
      action: "delete_customer",
      entityType: "Customer",
      entityId: req.params.id,
      meta: {
        customerId: customer.customerId,
        name: customer.name,
      },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ PROFILE PHOTO UPLOAD/DELETE
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

    await logAction({
      req,
      action: "delete_photo",
      entityType: "Customer",
      entityId: customer._id,
      meta: { customerId: customer.customerId, name: customer.name },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ KYC File Upload
================================ */
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

    await logAction({
      req,
      action: "upload_kyc",
      entityType: "Customer",
      entityId: item._id,
      meta: {
        customerId: item.customerId,
        name: item.name,
        documentType: req.body.label || "KYC",
      },
    });

    res.json({ ok: true, file: item.kyc.files[item.kyc.files.length - 1] });
  } catch (e) {
    next(e);
  }
});

/* ================================
   💰 DISBURSEMENT ROUTES
================================ */

// ➕ Add Disbursement
router.post("/:id/disbursements", auth, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const disb = {
      amount: req.body.amount,
      date: req.body.date || new Date(),
      notes: req.body.notes || "",
    };

    customer.disbursements.push(disb);
    await customer.save();

    await logAction({
      req,
      action: "add_disbursement",
      entityType: "Customer",
      entityId: customer._id,
      meta: {
        customerId: customer.customerId,
        name: customer.name,
        amount: disb.amount,
      },
    });

    res.status(201).json(disb);
  } catch (e) {
    next(e);
  }
});

// 📋 List Disbursements
router.get("/:id/disbursements", auth, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    res.json(customer.disbursements || []);
  } catch (e) {
    next(e);
  }
});

// ❌ Delete Disbursement
router.delete("/:id/disbursements/:disbId", auth, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const disbursement = customer.disbursements.find(
      (d) => d._id.toString() === req.params.disbId
    );

    customer.disbursements = customer.disbursements.filter(
      (d) => d._id.toString() !== req.params.disbId
    );

    await customer.save();

    if (disbursement) {
      await logAction({
        req,
        action: "delete_disbursement",
        entityType: "Customer",
        entityId: customer._id,
        meta: {
          customerId: customer.customerId,
          name: customer.name,
          amount: disbursement.amount,
        },
      });
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;