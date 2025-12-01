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
import "./cronDailyProfit.js";
import fileUpload from "express-fileupload";
import cloudinary from "cloudinary";

// Load env
if (process.env.NODE_ENV !== "production") dotenv.config();

// Cloudinary config
//CONFIGURE CLOUDINARY
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
});

// Initialize app
const app = express();

// ❗ MUST COME FIRST FOR KYC IMAGE UPLOADS
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    createParentPath: true
  })
);

// ❗ MUST COME AFTER fileUpload
app.use(express.json());
app.use(cookieParser());

// CORS
const allowedOrigins = [
  "https://app.emuntra.com",
  "https://investment-platform-eta.vercel.app",
  "https://api.emuntra.com",
  "https://emuntra.com",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:4000",
  "http://127.0.0.1:4000"
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");

  if (req.method === "OPTIONS") return res.status(204).send();
  next();
});

// Routes
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
import contactRoutes from "./routes/contactRoutes.js";
import nowpayRoutes from "./routes/nowpayRoutes.js";
import kycRoutes from "./routes/kycRoutes.js";
import adminKycRoutes from "./routes/adminKycRoutes.js";

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
app.use("/api/nowpay", nowpayRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/admin/kyc", adminKycRoutes);

// Serve frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "frontend")));

// DB connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));