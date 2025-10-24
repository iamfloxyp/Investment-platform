import { sendEmail } from "../utils/sendEmail.js";

export const sendContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ msg: "All fields are required." });
    }

    // Email to admin/support inbox
    await sendEmail({
      to: "hello@emuntra.com", // Replace with your domain support email
      subject: `📩 New Contact Message: ${subject || "General Inquiry"}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h3>New Message from Website Contact Form</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject || "No subject"}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
          <hr />
          <p>This message was sent via the Emuntra website contact form.</p>
        </div>
      `,
    });

    res.status(200).json({ msg: "Message sent successfully." });
  } catch (error) {
    console.error("❌ Contact form email error:", error);
    res.status(500).json({ msg: "Server error sending message." });
  }
};