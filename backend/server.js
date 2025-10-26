// server.js
import dotenv from "dotenv";
// Load .env only outside production
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import depositRoutes from "./routes/depositRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import Deposit from "./models/depositModel.js";
import externalRoutes from "./routes/externalRoutes.js";
import withdrawRoutes from "./routes/withdrawRoutes.js";
import Withdraw from "./models/withdrawModel.js"; // ✅ Added import for withdrawal fix
import referralRoutes from "./routes/referralRoutes.js"
import userRoutes from "./routes/userRoutes.js"
import paymentRoutes from "./routes/paymentRoutes.js";
import testEmailRoute from "./routes/testEmail.js"
const app = express();

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(cookieParser());

// ====== FIXED CORS ======
import cors from "cors";

// ✅ Allowed origins
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://emuntra-q35s.vercel.app"
];

// ✅ Use CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // ✅ allow cookies
  })
);
// ===== ROUTES =====
app.use("/api/auth", authRoutes);
app.use("/api/deposits", depositRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/external", externalRoutes);
app.use("/api/", withdrawRoutes);
app.use("/api/referrals", referralRoutes)
app.use("/api/users", userRoutes)
app.use("/api/payments", paymentRoutes);
app.use("/api", testEmailRoute)

// ===== TEST ROUTE =====
app.get("/api/auth/test", (req, res) => {
  res.json({ msg: "✅ Backend is working and CORS is configured correctly!" });
});

// ===== DB CONNECTION =====
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB connected");

    // 🧹 ONE-TIME FIX 1: convert old "withdrawal" -> "withdraw" in Deposit
    try {
      const result = await Deposit.updateMany(
        { type: "withdrawal" },
        { $set: { type: "withdraw" } }
      );
      console.log(`✅ Fixed old withdrawal records: ${result.modifiedCount} updated`);
    } catch (e) {
      console.error("⚠️ Migration error:", e.message);
    }

    // 🧹 ONE-TIME FIX 2: Convert old "userId" → "user" in Withdraw collection
    try {
      const result = await Withdraw.updateMany(
        { userId: { $exists: true } },
        [
          { $set: { user: "$userId" } }, // copy userId → user
          { $unset: "userId" }, // remove old field
        ]
      );
      console.log(`✅ Renamed userId → user in ${result.modifiedCount} withdrawal records`);
    } catch (err) {
      console.error("❌ Error migrating withdrawals:", err);
    }

    // Start server AFTER migrations
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });