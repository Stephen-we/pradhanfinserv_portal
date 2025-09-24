// server/src/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev");
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive)
      return res.status(401).json({ message: "Unauthorized" });

    req.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    };

    next();
  } catch (e) {
    next(e);
  }
};

// ✅ Add allowRoles too
export const allowRoles = (roles = []) => (req, res, next) => {
  if (!roles.length) return next(); // no restriction
  if (!req.user)
    return res.status(401).json({ message: "Unauthorized" });
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: "Forbidden" });
  next();
};
