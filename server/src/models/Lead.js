import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema({
  leadId: { type: String, unique: true }, // auto-generated
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String },
  source: { type: String }, // channel partner, walk-in, etc.

  leadType: { type: String, enum: ["Loan", "Insurance", "Real Estate"], default: "Loan" },
  subType: { type: String }, // e.g. Home Loan, Car Loan

  requirementAmount: { type: Number },
  sanctionedAmount: { type: Number },
  gdStatus: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },

  status: { type: String, enum: ["free_pool", "assigned", "archived", "deleted"], default: "free_pool" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  branch: { type: String },
  notes: { type: String }
}, { timestamps: true });

/**
 * Auto-generate unique leadId per day
 * Format: LEAD-YYYYMMDD-0001
 */
LeadSchema.pre("save", async function (next) {
  if (!this.leadId) {
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const countToday = await mongoose.model("Lead").countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    });

    this.leadId = `LEAD-${datePrefix}-${(countToday + 1).toString().padStart(4, "0")}`;
  }
  next();
});

export default mongoose.model("Lead", LeadSchema);
