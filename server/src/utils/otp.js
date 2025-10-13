// server/src/utils/otp.js
const otpStore = new Map(); // key: purpose:owner -> {code, expiresAt}

function keyOf(purpose, identifier) {
  return `${purpose}:${identifier}`;
}

export function generateOTP(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(Math.random() * (max - min + 1) + min));
}

export function saveOTP({ purpose, identifier, code, ttlSeconds }) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  otpStore.set(keyOf(purpose, identifier), { code, expiresAt });
}

export function verifyOTP({ purpose, identifier, code }) {
  const rec = otpStore.get(keyOf(purpose, identifier));
  if (!rec) return { ok: false, reason: "not_found" };
  if (Date.now() > rec.expiresAt) {
    otpStore.delete(keyOf(purpose, identifier));
    return { ok: false, reason: "expired" };
  }
  if (rec.code !== String(code)) return { ok: false, reason: "mismatch" };
  otpStore.delete(keyOf(purpose, identifier)); // one-time use
  return { ok: true };
}
