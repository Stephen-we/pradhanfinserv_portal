import express from "express";
import Partner from "../models/ChannelPartner.js";
import { auth } from "../middleware/auth.js";
import { listWithPagination } from "../utils/paginate.js";
const router = express.Router();

router.get("/", auth, async (req,res,next)=>{
  try{ 
    const { q, page=1, limit=10 } = req.query;
    const cond = q ? { $or: [{ name: {$regex:q,$options:"i"} }, { partnerId: {$regex:q,$options:"i"} }] } : {};
    const data = await listWithPagination(Partner, cond, { page, limit });
    res.json(data);
  }catch(e){ next(e); }
});

router.post("/", auth, async (req,res,next)=>{
  try{
    const last = await Partner.findOne().sort({ createdAt:-1 });
    const nextId = last && last.partnerId ? "CP"+(parseInt(last.partnerId.replace("CP",""),10)+1).toString().padStart(5,"0") : "CP10001";
    const item = await Partner.create({ ...req.body, partnerId: nextId });
    res.status(201).json(item);
  }catch(e){ next(e); }
});

router.put("/:id", auth, async (req,res,next)=>{
  try{ const item = await Partner.findByIdAndUpdate(req.params.id, req.body, {new:true}); res.json(item); }catch(e){ next(e); }
});

router.delete("/:id", auth, async (req,res,next)=>{
  try{ await Partner.findByIdAndDelete(req.params.id); res.json({ok:true}); }catch(e){ next(e); }
});

export default router;
