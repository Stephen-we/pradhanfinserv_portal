import mongoose from "mongoose";
import Counter from "./Counter.js"; // ✅ reuse the same counter model you used for Leads

const BankBranchSchema = new mongoose.Schema(
  {
    branchId: { type: String, unique: true }, // auto generated
    bankName: { type: String, required: true },
    branchName: { type: String, required: true },

    // Optional Details
    branchEmail: String,
    branchCode: String,

    managerName: String,
    managerNumber: String,       // Primary
    managerAltNumber: String,    // Secondary
    managerEmail: String,

    dsaCode: String,
    country: { type: String, default: "India" },
    state: { type: String, default: "Maharashtra" },
    city: String,
    pinCode: String,
  },
  { timestamps: true }
);

// ✅ Auto-generate branchId like BB10001
BankBranchSchema.pre("save", async function (next) {
  if (!this.branchId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "branch" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    this.branchId = `BB${String(counter.seq).padStart(5, "0")}`;
  }
  next();
});

export default mongoose.model("BankBranch", BankBranchSchema);
