import express from "express";
import Customer from "../models/Customer.js";
import { auth, allowRoles } from "../middleware/auth.js";
import { upload } from "../middleware/uploads.js";
import { listWithPagination } from "../utils/paginate.js";
const router = express.Router();

router.get("/", auth, async (req,res,next)=>{
  try{
    const { q, page=1, limit=10 } = req.query;
    const search = q ? { $or: [
      { name: {$regex: q, $options:"i"} },
      { mobile: {$regex: q, $options:"i"} },
      { email: {$regex: q, $options:"i"} },
      { customerId: {$regex: q, $options:"i"} }
    ] } : {};
    const data = await listWithPagination(Customer, search, { page, limit });
    res.json(data);
  }catch(e){ next(e); }
});

router.get("/:id", auth, async (req,res,next)=>{
  try{ const item = await Customer.findById(req.params.id); res.json(item); }
  catch(e){ next(e); }
});

router.post("/", auth, async (req,res,next)=>{
  try{
    const last = await Customer.findOne().sort({ createdAt: -1 });
    const nextId = last && last.customerId ? (parseInt(last.customerId,10)+1).toString() : "10001";
    const item = await Customer.create({ ...req.body, customerId: nextId });
    res.status(201).json(item);
  }catch(e){ next(e); }
});

router.post("/:id/kyc/upload", auth, upload.single("file"), async (req,res,next)=>{
  try{
    const item = await Customer.findById(req.params.id);
    if (!item) return res.status(404).json({message:"Customer not found"});
    item.kyc.files = item.kyc.files || [];
    item.kyc.files.push({ label: req.body.label || "KYC", path: `/uploads/${req.file.filename}`, originalName: req.file.originalname });
    await item.save();
    res.json({ ok:true, file: item.kyc.files[item.kyc.files.length-1] });
  }catch(e){ next(e); }
});

router.put("/:id", auth, allowRoles(["admin"]), async (req,res,next)=>{
  try{ const item = await Customer.findByIdAndUpdate(req.params.id, req.body, {new:true}); res.json(item); }
  catch(e){ next(e); }
});

router.delete("/:id", auth, allowRoles(["admin"]), async (req,res,next)=>{
  try{ await Customer.findByIdAndDelete(req.params.id); res.json({ok:true}); }
  catch(e){ next(e); }
});

export default router;
