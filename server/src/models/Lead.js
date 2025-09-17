import mongoose from "mongoose";
const LeadSchema = new mongoose.Schema({
  name: String,
  mobile: String,
  email: String,
  source: String,
  status: { type: String, enum: ["free_pool","assigned","archived","deleted"], default: "free_pool" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  notes: String
}, { timestamps: true });
export default mongoose.model("Lead", LeadSchema);
