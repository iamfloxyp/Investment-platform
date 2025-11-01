// server.js
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import cron from "node-cron";
import { runDailyProfit } from "./dailyProfitJob.js";
import path from "path";
import { fileURLToPath } from "url";

// ===== LOAD ENV =====
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// ===== DAILY PROFIT SCHEDULER =====
cron.schedule("0 2 * * *", async () => {
  try {
    console.log("⏰ Running scheduled daily profit job (2 AM UTC / 9 PM US Time)...");
    await runDailyProfit();
  } catch (error) {
    console.error("❌ Error running daily profit schedule:", error.message);
  }
});
console.log("✅ Daily profit scheduler initialized (runs 2 AM UTC / 9 PM US Time).");

// ===== IMPORT ROUTES =====
import authRoutes from "./routes/authRoutes.js";
import depositRoutes from "./routes/depositRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import externalRoutes from "./routes/externalRoutes.js";
import withdrawRoutes from "./routes/withdrawRoutes.js";
import referralRoutes from "./routes/referralRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import testEmailRoute from "./routes/testEmail.js";
import contactRoutes from "./routes/contactRoutes.js"

// ===== IMPORT MODELS =====
import Deposit from "./models/depositModel.js";
import Withdrawal from "./models/withdrawModel.js";

// ===== INITIALIZE APP =====
const app = express();

/// ===== FIXED CORS (FINAL VERSION) =====
const allowedOrigins = [
  "https://investment-platform-eta.vercel.app",
  "https://emuntra.com",
  "https://emuntra-backend.onrender.com",
  "http://127.0.0.1:5500",
  "http://localhost:5500"
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
// ===== MIDDLEWARE =====
app.use(express.json());
app.use(cookieParser());

// ===== ROUTES =====
app.use("/api/auth", authRoutes);
app.use("/api/deposits", depositRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/external", externalRoutes);
app.use("/api/withdrawals", withdrawRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api", testEmailRoute);
app.use("/api/contact", contactRoutes);

// ===== TEST ROUTE =====
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "✅ Backend working and CORS configured correctly!",
  });
});

// ===== DEBUG NOWPAYMENTS =====
app.get("/api/_debug/np", (req, res) => {
  const key = process.env.NOWPAYMENTS_API_KEY || "";
  res.json({
    keyExists: !!key,
    keyLength: key.length,
  });
});

// ===== FORCE LOGOUT ROUTE (for clearing stuck cookies) =====
app.get("/api/auth/force-logout", (req, res) => {
  try {
    res.clearCookie("emuntra_user_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    res.clearCookie("emuntra_admin_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    console.log("✅ All cookies cleared (force-logout route active)");
    return res.json({ message: "✅ All cookies cleared successfully" });
  } catch (err) {
    console.error("❌ Force logout error:", err);
    return res.status(500).json({ message: "Server error clearing cookies" });
  }
});

// ===== SERVE FRONTEND FILES =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "frontend")));

// ===== DATABASE CONNECTION & APP LISTEN =====
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB connected");

    try {
      // 🧹 Data migration (safe)
      const result1 = await Deposit.updateMany(
        { type: "withdrawal" },
        { $set: { type: "withdraw" } }
      );
      console.log(`✅ Updated deposits: ${result1.modifiedCount}`);

      const result2 = await Withdrawal.updateMany(
        { userId: { $exists: true } },
        [
          { $set: { user: "$userId" } },
          { $unset: "userId" },
        ]
      );
      console.log(`✅ Updated withdrawals: ${result2.modifiedCount}`);
    } catch (e) {
      console.error("⚠️ Migration error:", e.message);
    }

    // ✅ Start Server
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });