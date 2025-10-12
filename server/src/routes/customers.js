// server/src/routes/customer.js
import express from "express";
import Customer from "../models/Customer.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { upload } from "../middleware/uploads.js";
import { listWithPagination } from "../utils/paginate.js";
import { logAction } from "../middleware/audit.js";


const router = express.Router();

/* ================================
   ✅ LIST Customers (Search + Pagination)
================================ */
router.get("/", auth, async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    const search = q
      ? {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { mobile: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { customerId: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const data = await listWithPagination(Customer, search, { page, limit }, [
      { path: "channelPartner", select: "name email contact" },
    ]);

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
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

/* ================================
   ✅ UPDATE Customer
================================ */
router.put("/:id", auth, allowRoles(["admin", "superadmin"]), async (req, res, next) => {
  try {
    const item = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!item) return res.status(404).json({ message: "Customer not found" });
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
    await Customer.findByIdAndDelete(req.params.id);
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

    customer.disbursements = customer.disbursements.filter(
      (d) => d._id.toString() !== req.params.disbId
    );

    await customer.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
