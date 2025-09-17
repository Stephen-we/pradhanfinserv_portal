import mongoose from "mongoose";
const CaseSchema = new mongoose.Schema({
  caseId: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  loanType: { type: String, enum: ["Home Loan","Personal Loan","Business Loan","Education Loan","Vehicle Loan","LAP","MSME","LRD"], default: "Home Loan" },
  status: { type: String, enum: ["in-progress","pending-documents","approved","rejected","disbursed"], default: "in-progress" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  bankBranch: { type: mongoose.Schema.Types.ObjectId, ref: "BankBranch" },
  task: String,
  disbursedAmount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("Case", CaseSchema);
