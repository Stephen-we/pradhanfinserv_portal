// server/src/models/Leads
import mongoose from "mongoose";
import Counter from "./Counter.js";

const LeadSchema = new mongoose.Schema(
  {
    // Core
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: String,

    // Meta
    source: String,

    // Business
    leadId: { type: String, unique: true },
    leadType: { type: String, enum: ["Loan", "Insurance", "Real Estate"], default: "Loan" },
    subType: String,
    gdStatus: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
    branch: String,

    requirementAmount: Number,
    sanctionedAmount: Number,

    status: { type: String, enum: ["free_pool", "assigned", "archived", "deleted"], default: "free_pool" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // ✅ Added missing fields for conversion
    permanentAddress: String,
    currentAddress: String,
    siteAddress: String,
    officeAddress: String,
    pan: String,
    aadhar: String,

    notes: String,
  },
  { timestamps: true }
);

// ✅ Sequential ID (LEAD-000001, LEAD-000002, ...)
LeadSchema.pre("save", async function (next) {
  if (!this.leadId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "lead" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    this.leadId = `LEAD-${String(counter.seq).padStart(6, "0")}`;
  }
  next();
});

export default mongoose.model("Lead", LeadSchema);
