// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/userModel.js"; // 

export const protect = async (req, res, next) => {
  try {
    const token =
      req.cookies?.emuntra_token 

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Attach full user to req.user
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; // ✅ Now req.user exists!
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
}