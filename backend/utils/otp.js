// backend/utils/otp.js
import crypto from "crypto";

// 6-digit numeric string
export const makeCode = () => String(Math.floor(100000 + Math.random() * 900000));

// stable SHA-256 hash
export const hash = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");