// controllers/depositController.js
import mongoose from "mongoose";
import axios from "axios";
import Deposit from "../models/depositModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { sendEmail } from "../utils/sendEmail.js";

/* ============================================================
   ✅ ADMIN CREATES DEPOSIT FOR USER (NOWPAYMENTS + EXISTING LOGIC)
============================================================ */
export const addDepositForUser = async (req, res) => {
  try {
    console.log("🟢 Deposit request received:", req.body);

    let { userId, amount, method, plan, note, status, currency } = req.body;

    // ✅ Validate amount
    amount = Number(amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ msg: "Invalid amount" });
    }

    // ✅ Normalize plan name
    if (plan) {
      plan = plan.replace(/plan/i, "").trim().toLowerCase();
      const allowedPlans = ["bronze", "silver", "gold", "diamond", "platinum"];
      if (!allowedPlans.includes(plan)) {
        return res.status(400).json({ msg: `Invalid plan name: ${plan}` });
      }
      plan = plan.charAt(0).toUpperCase() + plan.slice(1);
    }

    // ✅ Find user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    /* ============================================================
       ✅ CREATE PAYMENT LINK WITH NOWPAYMENTS
    ============================================================ */
    const paymentResponse = await axios.post(
      "https://api.nowpayments.io/v1/invoice",
      {
        price_amount: amount,
        price_currency: currency || "usd", // You can change to "ngn" if needed
        pay_currency: method || "btc", // Example: btc, eth, usdt, etc.
        order_id: `emuntra_${Date.now()}`,
        order_description: `Deposit for ${plan} plan by ${user.firstName}`,
      },
      {
        headers: {
          "x-api-key": process.env.NOWPAYMENTS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // ✅ Handle payment link (convert http to https if necessary)
   let paymentLink = paymentResponse.data.invoice_url;

// ✅ Force HTTPS and rebuild if NowPayments returns insecure link
if (!paymentLink?.startsWith("https://")) {
  paymentLink = paymentLink.replace(/^http:\/\//, "https://");
}

// ✅ Ensure it still points to NowPayments
if (!paymentLink.includes("nowpayments.io")) {
  paymentLink = `https://nowpayments.io/payment?iid=${paymentResponse.data.invoice_id}`;
}

console.log("✅ Final verified secure payment link:", paymentLink);
    /* ============================================================
       ✅ SAVE DEPOSIT AS PENDING
    ============================================================ */
    const depositStatus = status || "pending";
    const deposit = new Deposit({
      user: userId,
      amount,
      method,
      plan,
      note,
      status: depositStatus,
      type: "deposit",
      paymentLink,
    });

    await deposit.save();
    console.log("✅ Deposit saved successfully:", deposit._id);

    /* ============================================================
       ⚠️ DO NOT SEND EMAIL OR IN-APP NOTIFICATION YET
       Email + notification will be triggered after admin approval
    ============================================================ */
    /* ============================================================
   ✅ SEND EMAIL + IN-APP NOTIFICATION AFTER APPROVAL
============================================================ */
try {
  // 📨 Create in-app notification
  await Notification.create({
    userId: deposit.user,
    title: "Deposit Approved ✅",
    message: `Your deposit of $${deposit.amount} for the ${deposit.plan} plan has been approved.`,
  });

  // 📧 Send email notification
  await sendEmail({
    to: user.email,
    subject: "Your Deposit Has Been Approved ✅",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;">
        <h2 style="color:#102630;">Deposit Approved</h2>
        <p>Hi ${user.firstName || "Investor"},</p>
        <p>Your deposit of <b>$${deposit.amount}</b> for the <b>${deposit.plan}</b> plan has been approved successfully.</p>
        <p>You can now view it in your <a href="https://emuntra.com/user/dashboard.html">Emuntra Dashboard</a>.</p>
        <br>
        <p style="color:#555;">Thank you for investing with Emuntra!</p>
      </div>
    `,
  });

  console.log("📩 Email + in-app notification sent successfully");
} catch (notifyErr) {
  console.error("⚠️ Notification/Email error:", notifyErr.message);
}

    return res.status(201).json({
      msg: "Deposit created. Complete payment using the provided link.",
      deposit,
      paymentLink,
    });

  } catch (err) {
    console.error("❌ addDepositForUser error:", err.message);
    return res.status(500).json({ msg: "Server error while creating deposit" });
  }
};
/* ============================================================
   ✅ GET ALL DEPOSITS (ADMIN)
============================================================ */
export const getAllDeposits = async (req, res) => {
  try {
    const deposits = await Deposit.find()
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });
    res.json(deposits);
  } catch (err) {
    console.error("❌ getAllDeposits error:", err);
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

    if (!mongoose.isValidObjectId(depositId)) {
      return res.status(400).json({ msg: "Invalid deposit ID" });
    }

    const deposit = await Deposit.findById(depositId).populate("user");
    if (!deposit) return res.status(404).json({ msg: "Deposit not found" });

    if (deposit.status === status) {
      return res.json({ msg: `Deposit already ${status}` });
    }

    deposit.status = status;
    await deposit.save();

    const user = deposit.user;

    if (status === "approved") {
      const method = deposit.method || "btc";

      if (!user.wallets) user.wallets = {};
      user.balance = (user.balance || 0) + Number(deposit.amount);
      user.wallets[method] = (user.wallets[method] || 0) + Number(deposit.amount);
      await user.save();

      await Notification.create({
        user: user._id,
        type: "deposit",
        message: `✅ Your ${method.toUpperCase()} deposit of $${deposit.amount} under ${deposit.plan} plan has been approved.`,
      });

      if (user.referredBy && mongoose.isValidObjectId(user.referredBy)) {
        try {
          const referrer = await User.findById(user.referredBy);
          if (referrer) {
            const commissionRate = 0.07;
            const commission = Number(deposit.amount) * commissionRate;

            referrer.referralEarnings = (referrer.referralEarnings || 0) + commission;
            referrer.balance = (referrer.balance || 0) + commission;
            await referrer.save();

            await Notification.create({
              user: referrer._id,
              type: "referral",
              message: `🎉 You earned $${commission.toFixed(
                2
              )} from ${user.firstName}'s deposit!`,
            });

            console.log(
              `💰 Referral commission of $${commission.toFixed(2)} sent to ${referrer.email}`
            );
          }
        } catch (refErr) {
          console.error("⚠️ Referral error during approval:", refErr.message);
        }
      }
    }

    if (status === "rejected") {
      await Notification.create({
        user: user._id,
        type: "deposit",
        message: `❌ Your deposit of $${deposit.amount} under ${deposit.plan} plan was rejected.`,
      });
    }

    res.json({ msg: `Deposit ${status} successfully`, deposit });
  } catch (err) {
    console.error("❌ updateDepositStatus error:", err.message);
    res.status(500).json({ msg: "Server error updating deposit" });
  }
};

/* ============================================================
   ✅ USER VIEWS THEIR OWN DEPOSITS
============================================================ */
export const getUserDeposits = async (req, res) => {
  try {
    const { userId } = req.params;
    const deposits = await Deposit.find({ user: userId }).sort({
      createdAt: -1,
    });
    res.json(deposits);
  } catch (err) {
    console.error("❌ getUserDeposits error:", err);
    res.status(500).json({ msg: "Server error fetching deposits" });
  }
};

/* ============================================================
   ✅ DELETE A DEPOSIT (ADMIN)
============================================================ */
export const deleteDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;
    const deleted = await Deposit.findByIdAndDelete(depositId);
    if (!deleted) return res.status(404).json({ msg: "Deposit not found" });
    res.json({ msg: "Deposit deleted successfully" });
  } catch (err) {
    console.error("❌ deleteDeposit error:", err);
    res.status(500).json({ msg: "Server error deleting deposit" });
  }
};