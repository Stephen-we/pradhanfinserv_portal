import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema({
  leadId: { type: String, unique: true }, // custom formatted ID
  name: String,
  mobile: String,
  email: String,
  source: String,
  leadType: { type: String, enum: ["Loan", "Insurance", "Real Estate"], default: "Loan" },
  subType: String,
  gdStatus: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
  status: { type: String, enum: ["free_pool", "assigned", "archived", "deleted"], default: "free_pool" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  branch: String,
  notes: String
}, { timestamps: true });

// auto-generate leadId
LeadSchema.pre("save", function(next) {
  if (!this.leadId) {
    this.leadId = Date.now().toString().slice(-8); // e.g. 25080006
  }
  next();
});

export default mongoose.model("Lead", LeadSchema);
