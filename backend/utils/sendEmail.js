// utils/sendEmail.js
import dotenv from "dotenv";
dotenv.config();

import fetch from "node-fetch";

const API_KEY = process.env.BREVO_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "hello@emuntra.com";

export async function sendEmail({ to, subject, html }) {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "Emuntra Investment", email: EMAIL_FROM },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Email send failed:", data);
      throw new Error(data.message || "Brevo API email send failed");
    }

    console.log("✅ Email sent via Brevo API:", data.messageId || data);
    return data;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
}

export default sendEmail;