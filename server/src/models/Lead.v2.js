import mongoose from "mongoose";

const LeadV2Schema = new mongoose.Schema({
  // keep old fields working
  name: String,
  mobile: String,
  email: String,
  source: String,
  status: { type: String, enum: ["free_pool","assigned","archived","deleted"], default: "free_pool" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  notes: String,

  // new OPTIONAL fields (won't break old docs)
  leadId: { type: String, index: true, unique: false },      // we'll not enforce unique to avoid trouble
  leadType: { type: String, enum: ["Loan","Insurance","Real Estate"], default: "Loan" },
  subType: { type: String, default: "" },
  gdStatus: { type: String, enum: ["Pending","In Progress","Completed"], default: "Pending" },
  branch: { type: String, default: "" },

  requirementAmount: { type: Number, default: null },
  sanctionedAmount:  { type: Number, default: null },
}, { timestamps: true });

// auto-generate simple leadId if missing (non-breaking)
LeadV2Schema.pre("save", function(next){
  if (!this.leadId) {
    // Example: 8-digit rolling id; safe & readable
    this.leadId = Date.now().toString().slice(-8);
  }
  next();
});

export default mongoose.model("LeadV2", LeadV2Schema, "leads"); 
// IMPORTANT: points at SAME "leads" collection so old data is visible
