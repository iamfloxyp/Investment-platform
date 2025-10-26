import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

// generate a token
const token = jwt.sign({ id: "123" }, process.env.JWT_SECRET.trim(), {
  expiresIn: "5m",
});
console.log("Generated token:", token);

// verify the token
try {
  const decoded = jwt.verify(token.trim(), process.env.JWT_SECRET.trim());
  console.log("✅ Token verified successfully:", decoded);
} catch (err) {
  console.error("❌ Verification failed:", err.message);
}