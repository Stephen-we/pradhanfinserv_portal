import express from "express";
import Case from "../models/Case.js";
import CaseAudit from "../models/CaseAudit.js";
import { auth } from "../middleware/auth.js";
import { listWithPagination } from "../utils/paginate.js";
const router = express.Router();

router.get("/", auth, async (req,res,next)=>{
  try{
    const { q, page=1, limit=10 } = req.query;
    const cond = q ? { $or: [{ caseId: {$regex:q,$options:"i"} }, { loanType: {$regex:q,$options:"i"} }, { status: {$regex:q,$options:"i"} }] } : {};
    const data = await listWithPagination(Case, cond, { page, limit });
    res.json(data);
  }catch(e){ next(e); }
});

router.post("/", auth, async (req,res,next)=>{
  try{
    const last = await Case.findOne().sort({ createdAt: -1 });
    const nextId = last && last.caseId ? (parseInt(last.caseId,10)+1).toString() : "25040001";
    const item = await Case.create({ ...req.body, caseId: nextId });
    await CaseAudit.create({ case: item._id, actor: req.user.id, action: "created" });
    res.status(201).json(item);
  }catch(e){ next(e); }
});

router.put("/:id", auth, async (req,res,next)=>{
  try{ 
    const prev = await Case.findById(req.params.id);
    const item = await Case.findByIdAndUpdate(req.params.id, req.body, {new:true});
    if (req.body.status && prev.status !== req.body.status){
      await CaseAudit.create({ case: item._id, actor: req.user.id, action: "status_changed", fromStatus: prev.status, toStatus: item.status });
    }else{
      await CaseAudit.create({ case: item._id, actor: req.user.id, action: "updated" });
    }
    res.json(item); 
  } catch(e){ next(e); }
});

router.post("/:id/comment", auth, async (req,res,next)=>{
  try{
    await CaseAudit.create({ case: req.params.id, actor: req.user.id, action: "comment", comment: req.body.comment });
    res.json({ok:true});
  }catch(e){ next(e); }
});

router.get("/:id/audit", auth, async (req,res,next)=>{
  try{
    const logs = await CaseAudit.find({ case: req.params.id }).populate("actor","name email role").sort({ createdAt: -1 });
    res.json(logs);
  }catch(e){ next(e); }
});

router.delete("/:id", auth, async (req,res,next)=>{
  try{ await Case.findByIdAndDelete(req.params.id); res.json({ok:true}); }
  catch(e){ next(e); }
});

export default router;
