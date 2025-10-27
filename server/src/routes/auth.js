// server/src/routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { auth } from "../middleware/auth.js";
import { logAction } from "../middleware/audit.js";
import { sendSMS } from "../utils/sms.js";
import { sendEmail } from "../utils/email.js"; // ✅ email fallback
import { generateOTP, saveOTP, verifyOTP } from "../utils/otp.js";

const router = express.Router();

const sign = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "dev", {
    expiresIn: "12h",
  });

const OWNER_PHONE = process.env.OWNER_PHONE || "+910000000000";
const OWNER_EMAIL = process.env.OWNER_EMAIL;
const OTP_EXPIRY_SECONDS = Number(process.env.OTP_EXPIRY_SECONDS || 300);

// 🔧 helper: verify OTP against any of the allowed purposes
function verifyAgainstPurposes({ purposes, code }) {
  for (const p of purposes) {
    const v = verifyOTP({ purpose: p, identifier: "owner", code: String(code) });
    if (v.ok) return { ok: true, purpose: p };
    // if not_found/mismatch/expired, try next purpose
  }
  return { ok: false, reason: "mismatch_or_not_found" };
}

/* -----------------------------
   Request OTP to OWNER (generic)
   body: { purpose: "signup" | "create_admin" | "create_user" | "forgot_..." }
------------------------------*/
router.post("/request-otp", async (req, res, next) => {
  try {
    const { purpose } = req.body;
    if (!purpose) return res.status(400).json({ message: "purpose is required." });

    const code = generateOTP(6);
    saveOTP({ purpose, identifier: "owner", code, ttlSeconds: OTP_EXPIRY_SECONDS });

    console.log(`✅ OTP generated for ${purpose}: ${code}`);

    // Prefer email (more reliable in dev)
    if (OWNER_EMAIL) {
      await sendEmail(
        OWNER_EMAIL,
        `OTP for ${purpose.toUpperCase()}`,
        `Your OTP for ${purpose.toUpperCase()} is: ${code}\n\nValid for ${OTP_EXPIRY_SECONDS / 60} minutes.`
      );
      console.log(`📧 OTP sent to ${OWNER_EMAIL}`);
    } else {
      await sendSMS(
        OWNER_PHONE,
        `OTP for ${purpose.toUpperCase()}: ${code} (valid ${OTP_EXPIRY_SECONDS / 60} min)`
      );
      console.log(`📱 OTP sent via SMS to ${OWNER_PHONE}`);
    }

    res.json({ ok: true, message: "OTP sent successfully." });
  } catch (e) {
    console.error("❌ OTP Request Error:", e);
    next(e);
  }
});

/* -----------------------------
   Signup / Create Admin (OTP to owner) => creates ADMIN
   Accept both purposes: "signup" and "create_admin"
------------------------------*/
async function handleCreateAdmin(req, res, next) {
  try {
    const { name, email, password, otp, purpose } = req.body;
    if (!name || !email || !password || !otp) {
      return res
        .status(400)
        .json({ message: "name, email, password, otp are required." });
    }

    // Purposes we accept for this flow (frontend may send either)
    const acceptedPurposes = purpose
      ? [String(purpose)]
      : ["signup", "create_admin"];

    // ✅ Verify OTP against any accepted purpose
    const v = verifyAgainstPurposes({ purposes: acceptedPurposes, code: otp });
    console.log("🔍 Verifying admin-create OTP:", v, "accepted:", acceptedPurposes);

    if (!v.ok) {
      return res
        .status(401)
        .json({ message: "Invalid or expired OTP" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const user = await User.create({
      name,
      email,
      password,
      role: "admin",
      isActive: true,
    });

    await logAction({
      req,
      action: "signup_admin",
      entityType: "User",
      entityId: user._id,
      meta: { email: user.email, usedPurpose: v.purpose },
    });

    const token = sign(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    console.error("❌ Signup/Create-Admin error:", e);
    next(e);
  }
}

// Route alias: support both /signup and /create-admin
router.post("/signup", handleCreateAdmin);
router.post("/create-admin", handleCreateAdmin);

/* -----------------------------
   Login
------------------------------*/
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    if (!user.isActive) {
      return res.status(403).json({ message: "Account disabled" });
    }

    const token = sign(user);
    await logAction({
      req,
      action: "login",
      entityType: "User",
      entityId: user._id,
      meta: { email: user.email },
    });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});

/* -----------------------------
   Forgot Password (OTP via email to owner)
------------------------------*/
router.post("/forgot-password/request-otp", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email is required." });

    const exists = await User.findOne({ email });
    if (!exists) return res.json({ ok: true }); // silent

    const code = generateOTP(6);
    const purpose = `forgot_${email}`;
    saveOTP({ purpose, identifier: "owner", code, ttlSeconds: OTP_EXPIRY_SECONDS });

    if (OWNER_EMAIL) {
      await sendEmail(
        OWNER_EMAIL,
        "Password Reset OTP",
        `OTP for resetting password of ${email}: ${code}`
      );
    } else {
      await sendSMS(OWNER_PHONE, `OTP for password reset of ${email}: ${code}`);
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/forgot-password/verify", async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res
        .status(400)
        .json({ message: "email, otp, newPassword are required." });

    const v = verifyOTP({
      purpose: `forgot_${email}`,
      identifier: "owner",
      code: String(otp),
    });
    if (!v.ok) {
      return res
        .status(401)
        .json({ message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(404).json({ message: "User not found." });

    user.password = newPassword;
    await user.save();

    await logAction({
      req,
      action: "reset_password",
      entityType: "User",
      entityId: user._id,
      meta: { email: user.email },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* -----------------------------
   Get current user
------------------------------*/
router.get("/me", auth, async (req, res, next) => {
  try {
    res.json(req.user);
  } catch (e) {
    next(e);
  }
});

export default router;
