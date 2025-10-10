// server.js
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import depositRoutes from "./routes/depositRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import Deposit from "./models/depositModel.js";

const app = express();

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(cookieParser());

// ====== FIXED CORS ======
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",
  "http://localhost:5500",
  "http://localhost:5501",
  "https://investment-platform-dzz7.vercel.app", // ✅ your frontend
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // 
  })
); 

// ===== ROUTES =====
app.use("/api/auth", authRoutes);
app.use("/api/deposits", depositRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

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

    // 🧹 ONE-TIME FIX: convert old "withdrawal" -> "withdraw"
    try {
      const result = await Deposit.updateMany(
        { type: "withdrawal" },
        { $set: { type: "withdraw" } }  // <-- convert to "withdraw"
      );
      console.log("✅ Fixed old withdrawal records: ${result.modifiedCount} updated");
    } catch (e) {
      console.error("⚠️ Migration error:", e.message);
    }

    // start server AFTER migration
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log("🚀 Server running on port ${PORT}"));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });