const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"], // your Live Server
    credentials: true,
  })
);

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

// Example route (you can remove later)
app.post("/api/ping", (req, res) => {
  res.json({ received: req.body || null, msg: "pong" });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});