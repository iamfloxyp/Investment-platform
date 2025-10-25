import express from "express";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

router.get("/test-email", async (req, res) => {
  try {
    await sendEmail({
      to: "maneyflorence@gmail.com", // put your real email here
      subject: "✅ Test Email from Emuntra",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Test Successful 🎉</h2>
          <p>Hello, this is a test email from <strong>Emuntra Platform</strong>.</p>
          <p>Your Brevo integration is working perfectly!</p>
        </div>
      `,
    });

    res.json({ msg: "Email sent successfully!" });
  } catch (error) {
    console.error("❌ Test email failed:", error);
    res.status(500).json({ msg: "Failed to send email." });
  }
});

export default router;