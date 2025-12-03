import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export default async function adminAuth(req, res, next) {
  try {
    const token = req.cookies.emuntra_token;

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access denied" });
    }

    req.user = user;
    next();

  } catch (err) {
    console.error("Admin Auth Error:", err);
    return res.status(401).json({ message: "Authentication failed" });
  }
}