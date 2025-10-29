import User from "../models/userModel.js";
import Withdrawal from "../models/withdrawModel.js";
import Notification from "../models/notificationModel.js";
import sendEmail from "../utils/sendEmail.js";

// ✅ Update user's wallet address
export const updateWallet = async (req, res) => {
  try {
    const { processor, address } = req.body;
    const userId = req.user.id;

    if (!processor || !address) {
      return res.status(400).json({ message: "Processor and address are required." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.walletAddresses) user.walletAddresses = {};
    user.walletAddresses[processor] = address;
    await user.save();

    res.status(200).json({
      message: `${processor.toUpperCase()} wallet updated successfully.`,
      walletAddresses: user.walletAddresses,
    });
  } catch (err) {
    console.error("❌ Wallet update error:", err);
    res.status(500).json({ message: "Server error while updating wallet." });
  }
};

// ✅ Create a withdrawal request
export const createWithdrawal = async (req, res) => {
  try {
    let { processor, amount, walletAddress } = req.body;
    const userId = req.user.id;

    if (!processor) return res.status(400).json({ message: "Processor is required." });

    amount = Number(amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.wallets) user.wallets = {};
    if (!user.walletAddresses) user.walletAddresses = {};

    if (!walletAddress) walletAddress = user.walletAddresses[processor];
    if (!walletAddress) {
      return res.status(400).json({ message: `Please set your ${processor.toUpperCase()} wallet first.` });
    }

    const balance = Number(user.wallets[processor] || 0);
    if (balance < amount) {
      return res.status(400).json({ message: "Insufficient balance." });
    }

    user.wallets[processor] = balance - amount;
    await user.save();

    const withdrawal = await Withdrawal.create({
      user: userId,
      processor,
      amount,
      walletAddress,
      status: "pending",
    });

    res.status(201).json({
      message: `Withdrawal of $${amount.toFixed(2)} in ${processor.toUpperCase()} created.`,
      withdrawal,
    });
  } catch (err) {
    console.error("❌ Withdrawal creation error:", err);
    res.status(500).json({ message: "Server error while creating withdrawal." });
  }
};

// ✅ Fetch all pending withdrawals for logged-in user
export const getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({
      user: req.user.id,
      status: "pending",
    }).sort({ createdAt: -1 });

    res.status(200).json(withdrawals);
  } catch (err) {
    console.error("❌ Error fetching pending withdrawals:", err);
    res.status(500).json({ message: "Server error while fetching withdrawals." });
  }
};

// ✅ Admin approves/rejects withdrawal + sends email + app notification
export const approveWithdrawal = async (req, res) => {
  try {
    const { status } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id).populate("user");

    if (!withdrawal) return res.status(404).json({ message: "Withdrawal not found" });
    withdrawal.status = status;
    await withdrawal.save();

    const msg =
      status === "approved"
        ? `✅ Your withdrawal of $${withdrawal.amount} in ${withdrawal.processor.toUpperCase()} has been approved and will be processed soon.`
        : `❌ Your withdrawal of $${withdrawal.amount} in ${withdrawal.processor.toUpperCase()} was rejected.`;

    // ✅ In-app notification
    await Notification.create({
      userId: withdrawal.user._id ||withdrawal.user,
      title: "Withdrawal Update",
      message: msg,
      type: "withdraw",
    });

    // ✅ Email notification
    await sendEmail({
      to: withdrawal.user.email,
      subject:
        status === "approved"
          ? "Withdrawal Approved ✅"
          : "Withdrawal Rejected ❌",
      html: `
        <div style="font-family:Arial,sans-serif;">
          <h2 style="color:#102630;">Withdrawal ${status.toUpperCase()}</h2>
          <p>${msg}</p>
          <p>You can check your account for details.</p>
          <p>— Emuntra Team</p>
        </div>`,
    });

    res.status(200).json({ message: `Withdrawal ${status} successfully`, withdrawal });
  } catch (err) {
    console.error("❌ approveWithdrawal error:", err);
    res.status(500).json({ message: "Server error while approving withdrawal" });
  }
};