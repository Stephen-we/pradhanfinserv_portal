// server/src/models/Lead.js
import mongoose from "mongoose";
import Counter from "./Counter.js";

const LeadSchema = new mongoose.Schema(
  {
    // Core
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: String,
    dob: Date,

    // Meta
    source: String,

    // Business
    leadId: { type: String, unique: true },

    leadType: { 
      type: String, 
      enum: [
        "Business Loan",
        "Construction Loan",
        "Education Loan",
        "Insurance",
        "Real Estate"
      ], 
      required: true 
    },

    subType: { type: String },

    // GD Status
    gdStatus: { 
      type: String, 
      enum: ["Pending", "In Progress", "Completed"], 
      default: "Pending" 
    },

    bank: String,
    branch: String,

    channelPartner: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "ChannelPartner" 
    },

    requirementAmount: Number,
    sanctionedAmount: Number,

    // ✅ System status for flow
    status: { 
      type: String, 
      enum: ["free_pool", "assigned", "archived", "deleted", "Pending", "Postpone"], 
      default: "free_pool" 
    },

    workflowStatus: {
      type: String,
      enum: ["FreePool", "Postpone"],
      default: "FreePool",
    },

    // ✅ New archived-specific status
    archivedStatus: { 
      type: String, 
      enum: ["", "In Progress", "Postpone"], 
      default: "" 
    },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

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

// Sequential ID (LEAD-000001, LEAD-000002, ...)
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
