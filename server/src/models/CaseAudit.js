//server/src/routes/CaseAudit.js
import mongoose from "mongoose";
const CaseAuditSchema = new mongoose.Schema({
  case: { type: mongoose.Schema.Types.ObjectId, ref: "Case" },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, enum: ["created","status_changed","comment","updated"] },
  fromStatus: String,
  toStatus: String,
  comment: String
}, { timestamps: true });

export default mongoose.model("CaseAudit", CaseAuditSchema);
