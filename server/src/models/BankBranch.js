import mongoose from "mongoose";
const BankBranchSchema = new mongoose.Schema({
  branchId: { type: String, unique: true },
  bankName: String,
  branchName: String,
  managerNumber: String
}, { timestamps: true });
export default mongoose.model("BankBranch", BankBranchSchema);
