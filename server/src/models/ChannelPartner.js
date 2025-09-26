// server/src/models/ChannelPartner.js
import mongoose from "mongoose";
const ChannelPartnerSchema = new mongoose.Schema({
  partnerId: { type: String, unique: true },
  name: String,
  contactNumber: String,
  email: String,
  products: [String],
  commission: Number
}, { timestamps: true });
export default mongoose.model("ChannelPartner", ChannelPartnerSchema);
