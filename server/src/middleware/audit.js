import AuditLog from "../models/AuditLog.js";

export async function logAction({ req, action, entityType = "", entityId = "", meta = {} }) {
  try {
    await AuditLog.create({
      actor: req?.user?.id || null,
      action,
      entityType,
      entityId: String(entityId || ""),
      meta,
      ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
      userAgent: req.headers["user-agent"] || "",
    });
  } catch (e) {
    // Don't crash the request because of logging
    console.warn("Audit log failed:", e.message);
  }
}
