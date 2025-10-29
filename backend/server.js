// server.js
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";

// ===== LOAD ENV =====
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

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

// ===== IMPORT MODELS =====
import Deposit from "./models/depositModel.js";
import Withdraw from "./models/withdrawModel.js";

const app = express();

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(cookieParser());

// ===== FIXED CORS =====
// ===== FIXED CORS CONFIGURATION =====
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",
  "http://localhost:5500",
  "http://localhost:5501",
  "https://investment-platform-eta.vercel.app",
  "https://api.emuntra.com",
  "https://emuntra.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // ✅ enable cookies
  })
);
// ===== ROUTES =====
app.use("/api/auth", authRoutes);
app.use("/api/deposits", depositRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/external", externalRoutes);
app.use("/api/withdraw", withdrawRoutes); // ✅ clearer path
app.use("/api/referrals", referralRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api", testEmailRoute);

// ===== TEST ROUTE =====
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "✅ Backend working and CORS configured correctly!",
  });
});

app.get("/api/_debug/np", (req, res) => {
  const key = process.env.NOWPAYMENTS_API_KEY || "";
  res.json({
    keyExists: !!key,
    keyLength: key.length,
  });
});

// ===== DATABASE CONNECTION =====
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB connected");

    // 🧹 Data migration (safe)
    try {
      const result1 = await Deposit.updateMany(
        { type: "withdrawal" },
        { $set: { type: "withdraw" } }
      );
      console.log(`✅ Updated deposits: ${result1.modifiedCount}`);

      const result2 = await Withdraw.updateMany(
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

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });