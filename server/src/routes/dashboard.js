// server/src/routes/dashboard.js
import express from "express";
import Lead from "../models/Lead.js";
import Case from "../models/Case.js";
const router = express.Router();

router.get("/", async (req,res,next)=>{
  try{
    const totalLeads = await Lead.countDocuments();
    const freePool = await Lead.countDocuments({ status: "free_pool" });
    const archived = await Lead.countDocuments({ status: "archived" });
    const deleted = await Lead.countDocuments({ status: "deleted" });
    const activeCases = await Case.countDocuments({ status: { $in: ["in-progress","pending-documents"] } });
    const approved = await Case.countDocuments({ status: "approved" });
    const disbursedCases = await Case.find({ status: "disbursed" }, { disbursedAmount: 1, date: 1 });
    const disbursedAmount = disbursedCases.reduce((s,c)=>s+(c.disbursedAmount||0), 0);

    res.json({
      kpis: { totalLeads, freePool, archived, deleted, activeCases, approved, disbursedAmount }
    });
  }catch(e){ next(e); }
});

export default router;
