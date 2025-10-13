import axios from "axios";
import { sendEmail } from "./email.js";

export async function sendSMS(to, message) {
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log(`📩 [DEV SMS] to=${to} :: ${message}`);
      // Always send backup email even in dev
      await sendEmail(process.env.OWNER_EMAIL, "DEV OTP", message);
      return { ok: true, dev: true };
    }

    // Check if MSG91 credentials are set
    if (
      !process.env.MSG91_AUTH_KEY ||
      process.env.MSG91_AUTH_KEY === "your_msg91_auth_key_here"
    ) {
      console.warn("⚠️ MSG91 not configured — sending OTP via email fallback.");
      await sendEmail(process.env.OWNER_EMAIL, "OTP Notification", message);
      return { ok: true, emailFallback: true };
    }

    // Try MSG91 SMS
    const response = await axios.post(
      "https://control.msg91.com/api/v5/flow/",
      {
        template_id: process.env.MSG91_TEMPLATE_ID,
        sender: process.env.MSG91_SENDER_ID,
        short_url: "1",
        recipients: [
          { mobiles: to.replace("+91", ""), VAR1: message },
        ],
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "content-type": "application/json",
        },
      }
    );

    console.log("✅ SMS sent via MSG91:", response.data);
    return { ok: true, via: "msg91" };
  } catch (err) {
    console.error("❌ SMS send error:", err.message);
    console.log("📧 Fallback to email...");
    await sendEmail(process.env.OWNER_EMAIL, "OTP Notification", message);
    return { ok: false, error: err.message, fallback: "email" };
  }
}
