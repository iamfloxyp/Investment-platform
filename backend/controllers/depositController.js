// controllers/depositController.js
import Deposit from "../models/depositModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { sendEmail } from "../utils/sendEmail.js";

// ✅ Admin adds a deposit for a user
export const addDepositForUser = async (req, res) => {
  try {
    const { userId, amount, method, note } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const deposit = new Deposit({
      user: userId,
      amount,
      method,
      note,
      status: "approved", // admin-initiated = auto-approved
    });

    await deposit.save();

    // 🔔 Create in-app notification
    await Notification.create({
      user: userId,
      type: "deposit",
      message: `A deposit of $${amount} has been added to your account.`,
    });

    // 📧 Send email to user
    await sendEmail({
      to: user.email,
      subject: "Deposit Added to Your Account",
      html: `
        <p>Hi ${user.firstName || user.name || "there"},</p>
        <p>A deposit of <strong>$${amount}</strong> has been successfully added to your account using the method: <strong>${method}</strong>.</p>
        ${note ? `<p>Note: ${note}</p>` : ""}
        <p>Thank you,<br/>Emuntra Team</p>
      `,
    });

    res.status(201).json({ msg: "Deposit created", deposit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ✅ Admin fetches all deposits
export const getAllDeposits = async (req, res) => {
  try {
    const deposits = await Deposit.find().populate("user", "firstName lastName email");
    res.json(deposits);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// ✅ Admin updates a deposit status (e.g., from pending to approved)
export const updateDepositStatus = async (req, res) => {
  try {
    const { depositId } = req.params;
    const { status } = req.body;

    const deposit = await Deposit.findById(depositId).populate("user");
    if (!deposit) return res.status(404).json({ msg: "Deposit not found" });

    deposit.status = status || deposit.status;
    await deposit.save();

    // If status is updated to 'approved', notify user
    if (status === "approved") {
      await Notification.create({
        user: deposit.user._id,
        type: "deposit",
        message: `Your deposit of $${deposit.amount} has been approved.`,
      });

      await sendEmail({
        to: deposit.user.email,
        subject: "Deposit Approved",
        html: `
          <p>Hello ${deposit.user.firstName || deposit.user.name || "there"},</p>
          <p>Your deposit of <strong>$${deposit.amount}</strong> has been approved by the admin.</p>
          <p>Thank you,<br/>Emuntra Team</p>
        `,
      });
    }

    res.json({ msg: "Deposit updated", deposit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ✅ User views their deposits
export const getUserDeposits = async (req, res) => {
  try {
    const { userId } = req.params;

    const deposits = await Deposit.find({ user: userId }).sort({ createdAt: -1 });

    res.json(deposits);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};