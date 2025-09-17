import express from "express";
import Branch from "../models/BankBranch.js";
import { auth } from "../middleware/auth.js";
import { listWithPagination } from "../utils/paginate.js";
const router = express.Router();

router.get("/", auth, async (req,res,next)=>{
  try{ 
    const { q, page=1, limit=10 } = req.query;
    const cond = q ? { $or: [{ bankName: {$regex:q,$options:"i"} }, { branchName: {$regex:q,$options:"i"} }, { branchId: {$regex:q,$options:"i"} }] } : {};
    const data = await listWithPagination(Branch, cond, { page, limit });
    res.json(data);
  }catch(e){ next(e); }
});

router.post("/", auth, async (req,res,next)=>{
  try{
    const last = await Branch.findOne().sort({ createdAt:-1 });
    const next = last && last.branchId ? "BB"+(parseInt(last.branchId.replace("BB",""),10)+1).toString().padStart(5,"0") : "BB10001";
    const item = await Branch.create({ ...req.body, branchId: next });
    res.status(201).json(item);
  }catch(e){ next(e); }
});

router.put("/:id", auth, async (req,res,next)=>{
  try{ const item = await Branch.findByIdAndUpdate(req.params.id, req.body, {new:true}); res.json(item); }catch(e){ next(e); }
});

router.delete("/:id", auth, async (req,res,next)=>{
  try{ await Branch.findByIdAndDelete(req.params.id); res.json({ok:true}); }catch(e){ next(e); }
});

export default router;
