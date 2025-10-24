// utils/sendEmail.js
import dotenv from "dotenv";
dotenv.config();

import nodemailer from "nodemailer";

const host = process.env.EMAIL_HOST;
const port = Number(process.env.EMAIL_PORT);
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

console.log("✅ SMTP ENV CHECK:", {
  host,
  port,
  user,
  pass: pass ? "✓" : "missing",
});

let transporter = null;

if (host && port && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,              // 587 for TLS, 465 for SSL
    secure: false,     // set true only if you use port 465
    auth: { user, pass },
    logger: true,
    debug: true,
  });

  transporter
    .verify()
    .then(() => console.log("✅ SMTP ready"))
    .catch((err) => console.error("❌ SMTP verify failed:", err));
} else {
  console.warn("⚠️ SMTP not fully configured, skipping transporter setup.");
}

// ---- Export as BOTH named and default ----
export async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    console.warn("❌ Email not sent: Transporter not configured.");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `Emuntra Platform <${user}>`,
      to,
      subject,
      html,
    });
    console.log("📧 Mail sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw error;
  }
}

export default sendEmail;