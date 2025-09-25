//server/src/routes/branches.js
import express from "express";
import Branch from "../models/BankBranch.js";
import { auth } from "../middleware/auth.js";
import { listWithPagination } from "../utils/paginate.js";

const router = express.Router();

// 📌 List all with pagination + search
router.get("/", auth, async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    const cond = q
      ? {
          $or: [
            { bankName: { $regex: q, $options: "i" } },
            { branchName: { $regex: q, $options: "i" } },
            { branchId: { $regex: q, $options: "i" } },
          ],
        }
      : {};
    const data = await listWithPagination(Branch, cond, { page, limit });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// 📌 Create new branch
router.post("/", auth, async (req, res, next) => {
  try {
    const last = await Branch.findOne().sort({ createdAt: -1 });
    const next =
      last && last.branchId
        ? "BB" +
          (parseInt(last.branchId.replace("BB", ""), 10) + 1)
            .toString()
            .padStart(5, "0")
        : "BB10001";
    const item = await Branch.create({ ...req.body, branchId: next });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

// 📌 Get single branch (for view page)
router.get("/:id", auth, async (req, res, next) => {
  try {
    const item = await Branch.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Branch not found" });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

// 📌 Update branch
router.put("/:id", auth, async (req, res, next) => {
  try {
    const item = await Branch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

// 📌 Delete branch
router.delete("/:id", auth, async (req, res, next) => {
  try {
    await Branch.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// 🔹 Distinct bank names
router.get("/banks/distinct", auth, async (req, res, next) => {
  try {
    const banks = await Branch.distinct("bankName");
    res.json(banks.sort());
  } catch (e) {
    next(e);
  }
});

// 🔹 Branch names for a bank
router.get("/banks/:bankName/branches", auth, async (req, res, next) => {
  try {
    const { bankName } = req.params;
    const branches = await Branch.find({ bankName }, { branchName: 1, _id: 0 })
      .sort({ branchName: 1 });
    res.json(branches.map((b) => b.branchName));
  } catch (e) {
    next(e);
  }
});

export default router;
