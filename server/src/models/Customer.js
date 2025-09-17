import mongoose from "mongoose";
const FileSchema = new mongoose.Schema({
  label: String,
  path: String,
  originalName: String,
  uploadedAt: { type: Date, default: Date.now }
}, { _id:false });

const CustomerSchema = new mongoose.Schema({
  customerId: { type: String, unique: true },
  name: { type: String, required: true },
  dob: Date,
  mobile: String,
  email: String,
  kyc: {
    pan: String,
    aadhar: String,
    files: [FileSchema]
  },
  education: {
    highestQualification: String,
    qualifyingYear: Number
  },
  family: {
    maritalStatus: String,
    dependents: Number
  },
  address: {
    permanent: {
      line1: String, line2: String, landmark: String, country: String, state: String, city: String, pin: String
    },
    correspondence: {
      line1: String, line2: String, landmark: String, country: String, state: String, city: String, pin: String
    }
  },
  logNotes: String
}, { timestamps: true });

export default mongoose.model("Customer", CustomerSchema);
