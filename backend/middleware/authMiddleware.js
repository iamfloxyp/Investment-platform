 import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const protect = async (req, res, next) => {
  try {
    // ✅ Always prioritize the admin token first
    let token = null;
    if (req.cookies?.emuntra_admin_token) {
      token = req.cookies.emuntra_admin_token;
    } else if (req.cookies?.emuntra_token) {
      token = req.cookies.emuntra_token;
    }

    // ✅ Fallback: Authorization header
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Get user info
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    req.userRole = decoded.role; // store directly

    next();
  } catch (error) {
    console.error("Protect error:", error.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ✅ Restrict to Admin Only
export const adminOnly = (req, res, next) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access only" });
  }
  next();
};