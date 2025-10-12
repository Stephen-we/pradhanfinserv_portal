import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true }, // e.g., "signup", "login", "update_customer", "export_excel"
    entityType: { type: String, default: "" }, // "Lead" | "Case" | "Customer" | "User" | ...
    entityId: { type: String, default: "" },   // doc id or identifier
    meta: { type: Object, default: {} },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", AuditLogSchema);
