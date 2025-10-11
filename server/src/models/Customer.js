// server/src/models/Customer.js
import mongoose from "mongoose";

// 🧾 File SubSchema
const FileSchema = new mongoose.Schema(
  {
    label: String,
    path: String,
    originalName: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// 💰 Disbursement SubSchema
const DisbursementSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  notes: { type: String, default: "" },
});

// 👤 Customer Schema
const CustomerSchema = new mongoose.Schema(
  {
    // IDs
    customerId: { type: String, unique: true, required: true },

    // Basics
    name: { type: String, required: true },
    dob: Date,
    mobile: String,
    email: String,
    photo: String,

    // UI-facing simple fields
    channelPartner: String,
    bankName: String,
    branch: String,

    // Status (Open/Close)
    status: { type: String, enum: ["open", "close"], default: "open" },

    // KYC
    kyc: {
      pan: String,
      aadhar: String,
      files: [FileSchema],
    },

    // Education
    education: {
      highestQualification: String,
      qualifyingYear: Number,
    },

    // Family
    family: {
      maritalStatus: String,
      dependents: Number,
    },

    // Address
    address: {
      permanent: {
        line1: String,
        line2: String,
        landmark: String,
        country: String,
        state: String,
        city: String,
        pin: String,
      },
      correspondence: {
        line1: String,
        line2: String,
        landmark: String,
        country: String,
        state: String,
        city: String,
        pin: String,
      },
    },

    // 💰 Disbursement details
    disbursements: [DisbursementSchema],

    // 📝 Notes
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Customer", CustomerSchema);
