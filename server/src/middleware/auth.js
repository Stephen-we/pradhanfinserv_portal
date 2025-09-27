import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "dev");
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      if (err.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Token invalid" });
      }
      return res.status(401).json({ message: "Token verification failed" });
    }

    // Find user in DB
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    if (!user.isActive) {
      return res.status(401).json({ message: "User inactive" });
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    };

    next();
  } catch (e) {
    console.error("❌ Auth error:", e.message);
    return res.status(500).json({ message: "Server error", error: e.message });
  }
};

// ✅ Role-based access control
export const allowRoles = (roles = []) => (req, res, next) => {
  if (!roles.length) return next(); // no restriction
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized: No user in request" });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: Insufficient role" });
  }
  next();
};
