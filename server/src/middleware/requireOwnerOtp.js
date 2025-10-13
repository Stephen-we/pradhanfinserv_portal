// server/src/middleware/requireOwnerOtp.js
import { verifyOTP } from "../utils/otp.js";

export function requireOwnerOtp(purposeField = "purpose") {
  return (req, res, next) => {
    const otp = req.body?.otp;
    const purpose = req.body?.[purposeField];
    if (!otp || !purpose) {
      return res.status(400).json({ message: "OTP and purpose are required." });
    }
    const v = verifyOTP({ purpose, identifier: "owner", code: String(otp) });
    if (!v.ok) {
      const map = { not_found: "OTP not found", expired: "OTP expired", mismatch: "Invalid OTP" };
      return res.status(401).json({ message: map[v.reason] || "OTP verification failed" });
    }
    return next();
  };
}
