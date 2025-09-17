// sendEmail.js
import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

console.log("✅ SMTP ENV CHECK:", {
  host,
  port,
  user,
  pass: pass ? "✓" : "missing"
});

let transporter = null;

if (host && port && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port: +port,
    secure: false,
    auth: {
      user,
      pass,
    },
    logger: true,
    debug: true,
  });

  transporter.verify()
    .then(() => console.log("✅ SMTP ready"))
    .catch(err => console.error("❌ SMTP verify failed:", err));
} else {
  console.warn("⚠️ SMTP not fully configured, skipping transporter setup.");
}

export const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    console.warn("❌ Email not sent: Transporter not configured.");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `FinBloom <${user}>`,
      to,
      subject,
      html
    });
    console.log("📧 Mail sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw error;
  }
};