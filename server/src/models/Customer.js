// server/src/models/Customer.js
import mongoose from "mongoose";

const FileSchema = new mongoose.Schema(
  {
    label: String,
    path: String,
    originalName: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CustomerSchema = new mongoose.Schema(
  {
    // IDs
    customerId: { type: String, unique: true, required: true }, // <- required + unique

    // Basics
    name: { type: String, required: true },
    dob: Date,
    mobile: String,
    email: String,
    photo: String, 

    // UI-facing simple fields (kept simple to match your current Customers page)
    channelPartner: String,           // <- simple string so table shows it directly
    bankName: String,                 // <- matches your table accessor
    branch: String,

    // Status (Open/Close)
    status: { type: String, enum: ["open", "close"], default: "open" }, // <- default Open

    // KYC
    kyc: {
      pan: String,
      aadhar: String,
      files: [FileSchema],
    },

    // Education (existing)
    education: {
      highestQualification: String,
      qualifyingYear: Number,
    },

    // Family (existing)
    family: {
      maritalStatus: String,
      dependents: Number,
    },

    // Address (existing)
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

    // Notes (existing)
    logNotes: String,
  },
  { timestamps: true }
);

export default mongoose.model("Customer", CustomerSchema);
