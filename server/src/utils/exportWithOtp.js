import { generateOTP, saveOTP, verifyOTP } from "./otp.js";
import { sendEmail } from "./email.js";

export async function requestExportOtp(req, purpose = "generic_export") {
  const code = generateOTP(6);
  saveOTP({ purpose, identifier: "owner", code, ttlSeconds: 300 });

  const user = req.user || {};
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.connection.remoteAddress ||
    req.ip ||
    "Unknown IP";

  const ownerEmail = process.env.OWNER_EMAIL;
  const message = `
🔐 OTP for ${purpose.replace("_", " ").toUpperCase()}: ${code}

Requested by:
👤 Name: ${user.name || "Unknown"}
📧 Email: ${user.email || "Unknown"}
🧩 Role: ${user.role || "Unknown"}
🌐 IP: ${ip}

Valid for 5 minutes.
`;

  if (ownerEmail) {
    await sendEmail(ownerEmail, `OTP Request: ${purpose}`, message);
  }

  return { ok: true, code, requester: { name: user.name, email: user.email, ip } };
}

export async function verifyExportOtp(purpose, otp) {
  const v = verifyOTP({ purpose, identifier: "owner", code: String(otp) });
  if (!v.ok) {
    const map = {
      not_found: "OTP not found",
      expired: "OTP expired",
      mismatch: "Invalid OTP",
    };
    return { ok: false, message: map[v.reason] || "OTP verification failed" };
  }
  return { ok: true };
}
