import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

// 🧩 Protect Middleware
export const protect = async (req, res, next) => {
  try {
    // ✅ Try reading the token from cookies first
    let token = req.cookies?.emuntra_token;

    // 🧠 Optional fallback for debugging (sometimes cookies don’t attach in dev)
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Find user in database
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // ✅ Attach user data to request object
    req.user = user;
    req.userId = decoded.id;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// 🔒 Admin-only Middleware
export const adminOnly = (req, res, next) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};