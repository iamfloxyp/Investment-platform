// controllers/depositController.js
import Deposit from "../models/depositModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { sendEmail } from "../utils/sendEmail.js";

/* ============================================================
   ✅ ADMIN ADDS A DEPOSIT FOR A USER (can be pending or approved)
============================================================ */
export const addDepositForUser = async (req, res) => {
  try {
    const { userId, amount, method, note, status } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Status defaults to 'pending' if not set
    const depositStatus = status || "pending";

    const deposit = new Deposit({
      user: userId,
      amount,
      method,
      note,
      status: depositStatus,
      type: "deposit",
    });

    await deposit.save();

    // Only update balance if the deposit is approved immediately
    if (depositStatus === "approved") {
      user.balance = (user.balance || 0) + Number(amount);
      await user.save();
    }

    // 🔔 Create notification
    await Notification.create({
      user: userId,
      type: "deposit",
      message:
        depositStatus === "approved"
          ? `A deposit of $${amount} has been added to your account.`
          : `A deposit of $${amount} is pending approval.`,
    });

    res.status(201).json({ msg: "Deposit created", deposit });
  } catch (err) {
    console.error("❌ addDepositForUser error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/* ============================================================
   ✅ GET ALL DEPOSITS (Admin)
============================================================ */
export const getAllDeposits = async (req, res) => {
  try {
    const deposits = await Deposit.find()
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });
    res.json(deposits);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

/* ============================================================
   ✅ UPDATE DEPOSIT STATUS (Approve / Reject)
============================================================ */
export const updateDepositStatus = async (req, res) => {
  try {
    const { depositId } = req.params;
    const { status } = req.body;

    const deposit = await Deposit.findById(depositId).populate("user");
    if (!deposit) return res.status(404).json({ msg: "Deposit not found" });

    deposit.status = status;
    await deposit.save();

    // Handle balance change if approved
    if (status === "approved") {
      deposit.user.balance = (deposit.user.balance || 0) + deposit.amount;
      await deposit.user.save();

      await Notification.create({
        user: deposit.user._id,
        type: "deposit",
        message: `Your deposit of $${deposit.amount} has been approved.`,
      });
    }

    // Handle rejected
    if (status === "rejected") {
      await Notification.create({
        user: deposit.user._id,
        type: "deposit",
        message: `Your deposit of $${deposit.amount} was rejected by admin.`,
      });
    }

    res.json({ msg: "Deposit status updated", deposit });
  } catch (err) {
    console.error("❌ updateDepositStatus error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/* ============================================================
   ✅ USER VIEWS THEIR DEPOSITS
============================================================ */
export const getUserDeposits = async (req, res) => {
  try {
    const { userId } = req.params;
    const deposits = await Deposit.find({ user: userId }).sort({ createdAt: -1 });
    res.json(deposits);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

/* ============================================================
   ✅ DELETE DEPOSIT (Admin)
============================================================ */
export const deleteDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;
    const deleted = await Deposit.findByIdAndDelete(depositId);
    if (!deleted) return res.status(404).json({ msg: "Deposit not found" });

    res.json({ msg: "Deposit deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

/* ============================================================
   ✅ ADMIN INITIATES WITHDRAWAL FOR USER (Pending / Approved)
============================================================ */
export const withdrawFromUser = async (req, res) => {
  try {
    const { userId, amount, method, note, status } = req.body;
    console.log("🟢 withdraw body:", req.body);

    if (!userId || !amount || isNaN(amount)) {
      return res.status(400).json({ msg: "Invalid withdrawal data." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const withdrawAmount = Number(amount);
    if (withdrawAmount <= 0) {
      return res.status(400).json({ msg: "Withdrawal amount must be greater than zero." });
    }

    if (user.balance < withdrawAmount) {
      return res.status(400).json({ msg: "Insufficient balance." });
    }

    const withdrawStatus = status || "pending";

    const withdraw = new Deposit({
      user: userId,
      amount: withdrawAmount,
      method,
      note,
      status: withdrawStatus,
      type: "withdraw",
    });

    await withdraw.save();

    // Balance only deducted after approval
    if (withdrawStatus === "approved") {
      user.balance -= withdrawAmount;
      await user.save();
    }

    await Notification.create({
      user: userId,
      type: "withdraw",
      message:
        withdrawStatus === "approved"
          ? `A withdrawal of $${withdrawAmount} was processed successfully.`
          : `Your withdrawal of $${withdrawAmount} is pending admin approval.`,
    });

    res.status(201).json({ msg: "Withdrawal created", withdraw });
  } catch (err) {
    console.error("❌ Withdraw error:", err);
    res.status(500).json({ msg: "Server error while processing withdrawal." });
  }
};