// utils/sendEmail.js
import dotenv from "dotenv";
dotenv.config();
import fetch from "node-fetch";

export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = process.env.EMAIL_FROM;

  if (!apiKey || !sender) {
    console.error("❌ Missing Brevo API key or sender email");
    return;
  }

  const payload = {
    sender: { email: sender, name: "Emuntra Investment" },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Email send failed:", data);
    } else {
      console.log("📧 Email sent successfully:", data);
    }
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
}

export default sendEmail;