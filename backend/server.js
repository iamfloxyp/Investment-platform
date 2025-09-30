// server.js
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";

const app = express();

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(cookieParser());

// ✅ CORS setup (put BEFORE your routes)
const allowedOrigins = ["http://127.0.0.1:5501", "http://localhost:5500"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // allow cookies / auth headers
  })
);

// ===== ROUTES =====
app.use("/api/auth", authRoutes);

// ===== TEST ROUTE =====
app.get("/api/auth/test", (req, res) => {
  res.json({ msg: "✅ Backend is working and CORS is fixed!" });
});

// ===== DB CONNECTION =====
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(process.env.PORT || 4000, () =>
      console.log(`🚀 Server running on port ${process.env.PORT || 4000}`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });