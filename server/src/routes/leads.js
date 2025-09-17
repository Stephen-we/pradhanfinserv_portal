import express from "express";
import Lead from "../models/Lead.js";
import { auth } from "../middleware/auth.js";
import { listWithPagination } from "../utils/paginate.js";
const router = express.Router();

router.get("/", auth, async (req,res,next)=>{
  try{
    const { status, q, page=1, limit=10 } = req.query;
    const cond = {};
    if (status) cond.status = status;
    if (q) cond.$or = [
      { name: {$regex: q, $options:"i"} },
      { mobile: {$regex: q, $options:"i"} },
      { email: {$regex: q, $options:"i"} },
      { source: {$regex: q, $options:"i"} }
    ];
    const data = await listWithPagination(Lead, cond, { page, limit });
    res.json(data);
  }catch(e){ next(e); }
});

router.post("/", auth, async (req,res,next)=>{
  try{ const lead = await Lead.create(req.body); res.status(201).json(lead); }
  catch(e){ next(e); }
});

router.get("/:id", auth, async (req,res,next)=>{
  try{ const lead = await Lead.findById(req.params.id); res.json(lead); }
  catch(e){ next(e); }
});

router.put("/:id", auth, async (req,res,next)=>{
  try{ const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {new:true}); res.json(lead); }
  catch(e){ next(e); }
});

router.delete("/:id", auth, async (req,res,next)=>{
  try{ await Lead.findByIdAndUpdate(req.params.id, { status: "deleted" }); res.json({ok:true}); }
  catch(e){ next(e); }
});

export default router;
