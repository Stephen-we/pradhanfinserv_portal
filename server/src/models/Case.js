//server/src/models/Case.js
import mongoose from "mongoose";

const CaseSchema = new mongoose.Schema(
  {
    caseId: { type: String, unique: true },
    leadId: { type: String },

    // Applicant 1
    customerName: { type: String },
    mobile: { type: String },
    email: { type: String },

    // Co-Applicant
    applicant2Name: { type: String },
    applicant2Mobile: { type: String },
    applicant2Email: { type: String },

    // Loan Details
    loanType: {
      type: String,
      enum: [
        "Home Loan",
        "Personal Loan",
        "Business Loan",
        "Education Loan",
        "Vehicle Loan",
        "LAP",
        "MSME",
        "LRD",
      ],
      default: "Home Loan",
    },
    amount: { type: Number },
    bank: { type: String },
    branch: { type: String },
    status: { type: String, default: "" },

    // Contact Details
    permanentAddress: { type: String },
    currentAddress: { type: String },
    siteAddress: { type: String },
    officeAddress: { type: String },

    // KYC quick fields
    panNumber: { type: String },
    aadharNumber: { type: String },

    // 🔹 Legacy KYC uploads
    // Example: { "kycDoc_0": ["file1.pdf","file2.png"] }
    kycDocs: {
      type: Object,
      default: {},
    },

    // 🔹 New structured document sections (section → docs → files)
    documentSections: {
      type: Array, // keep flexible so it won’t break existing client/server code
      default: [],
    },

    // Extra
    notes: { type: String },

    // Relations
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    bankBranch: { type: mongoose.Schema.Types.ObjectId, ref: "BankBranch" },

    // Misc
    task: String,
    disbursedAmount: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Case", CaseSchema);
