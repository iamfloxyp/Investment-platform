import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const protect = async (req, res, next) => {
  try {
    let token = null;

    // ✅ 1. Check all possible cookie names (Render sometimes prefixes domain)
    if (req.cookies?.emuntra_user_token) {
      token = req.cookies.emuntra_user_token;
    } else if (req.cookies?.emuntra_admin_token) {
      token = req.cookies.emuntra_admin_token;
    } else if (req.cookies?.emuntra_token) {
      token = req.cookies.emuntra_token;
    }

    // ✅ 2. Fallback to Authorization header
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "No authentication token found" });
    }

    // ✅ 3. Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ 4. Get user data
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found or deleted" });
    }

    // ✅ Attach to request for next handlers
    req.user = user;
    req.userRole = decoded.role;

    next();
  } catch (err) {
    console.error("Protect middleware error:", err.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ✅ Restrict to Admins only
export const adminOnly = (req, res, next) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access only" });
  }
  next();
};