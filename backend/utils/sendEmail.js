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
    port, // 587 for TLS
    secure: port === 465, // true only if using SSL (465)
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false, // ✅ prevents Render SSL handshake issues
    },
    logger: true,
    debug: true,
  });

  // Verify connection on start
  transporter
    .verify()
    .then(() => console.log("✅ SMTP connection established successfully."))
    .catch((err) => console.error("❌ SMTP verify failed:", err.message));
} else {
  console.warn("⚠️ SMTP not fully configured — skipping transporter setup.");
}

// ---- Export sendEmail ----
export async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    console.warn("❌ Email not sent: transporter not initialized.");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `Emuntra Investment <${user}>`,
      to,
      subject,
      html,
    });
    console.log("📧 Mail sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
  }
}

export default sendEmail;