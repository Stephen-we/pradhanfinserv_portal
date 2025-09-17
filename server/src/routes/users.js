import express from "express";
import User from "../models/User.js";
import { auth, allowRoles } from "../middleware/auth.js";
const router = express.Router();

router.get("/", auth, allowRoles(["admin"]), async (req,res,next)=>{
  try{
    const users = await User.find().select("-password");
    res.json(users);
  }catch(e){ next(e); }
});

router.patch("/:id/role", auth, allowRoles(["admin"]), async (req,res,next)=>{
  try{
    const { role } = req.body;
    const u = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
    res.json(u);
  }catch(e){ next(e); }
});

router.patch("/:id/active", auth, allowRoles(["admin"]), async (req,res,next)=>{
  try{
    const { isActive } = req.body;
    const u = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true }).select("-password");
    res.json(u);
  }catch(e){ next(e); }
});

router.patch("/:id/password", auth, allowRoles(["admin"]), async (req,res,next)=>{
  try{
    const { password } = req.body;
    const u = await User.findById(req.params.id).select("+password");
    if (!u) return res.status(404).json({message:"Not found"});
    u.password = password;
    await u.save();
    res.json({ ok:true });
  }catch(e){ next(e); }
});

export default router;
