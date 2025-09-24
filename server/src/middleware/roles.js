// server/src/middleware/roles.js

/**
 * Middleware to allow only certain roles to access a route.
 * Usage: allowRoles(["admin", "superadmin"])
 */
export function allowRoles(roles = []) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    next();
  };
}
