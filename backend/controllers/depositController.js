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
// controllers/depositController.js
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
       ✅ MERGE LOGIC: Check if user already has same plan deposit
    ============================================================ */
// ============================================================
// ✅ Check if user already has a deposit for this plan
// ============================================================
const existingDeposit = await Deposit.findOne({ user: userId, plan });

if (existingDeposit) {
  console.log("⚡ Existing deposit found. Creating new payment for additional amount...");

  try {
    // ✅ Create new NowPayments invoice for top-up
    const paymentResponse = await axios.post(
      "https://api.nowpayments.io/v1/invoice",
      {
        price_amount: amount,
        price_currency: currency || "usd",
        pay_currency: method || "btc",
        order_id: `emuntra_${Date.now()}`,
        order_description: `Additional deposit of $${amount} to ${plan} plan by ${user.firstName}`,
      },
      {
        headers: {
          "x-api-key": process.env.NOWPAYMENTS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // ✅ Build the payment link safely
    let paymentLink = paymentResponse.data.invoice_url;
    if (!paymentLink?.startsWith("https://")) {
      paymentLink = paymentLink.replace(/^http:\/\//, "https://");
    }
    if (!paymentLink.includes("nowpayments.io")) {
      paymentLink = `https://nowpayments.io/payment?iid=${paymentResponse.data.invoice_id}`;
    }

    console.log("✅ Payment link for existing plan:", paymentLink);

    // ✅ Create a new pending deposit record (this one tracks the top-up)
    const newDeposit = new Deposit({
      user: userId,
      amount,
      method,
      plan,
      note: `Top-up for existing ${plan} plan`,
      status: "pending",
      type: "deposit",
    });

    await newDeposit.save();

    await Notification.create({
      user: userId,
      type: "deposit",
      message: `🆕 A new payment link has been created for your additional $${amount} deposit under ${plan} plan.`,
    });

    return res.status(201).json({
      msg: "Payment link created for existing plan deposit.",
      deposit: newDeposit,
      paymentLink,
    });
  } catch (npErr) {
    console.error("❌ NowPayments error:", npErr.message);
    return res.status(500).json({ msg: "Error connecting to payment server" });
  }
}
    /* ============================================================
       ✅ CREATE PAYMENT LINK WITH NOWPAYMENTS (New Plan)
    ============================================================ */
    const paymentResponse = await axios.post(
      "https://api.nowpayments.io/v1/invoice",
      {
        price_amount: amount,
        price_currency: currency || "usd",
        pay_currency: method || "btc",
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

    let paymentLink = paymentResponse.data.invoice_url;

    // ✅ Ensure HTTPS
    if (!paymentLink?.startsWith("https://")) {
      paymentLink = paymentLink.replace(/^http:\/\//, "https://");
    }
    if (!paymentLink.includes("nowpayments.io")) {
      paymentLink = `https://nowpayments.io/payment?iid=${paymentResponse.data.invoice_id}`;
    }

    console.log("✅ Final verified secure payment link:", paymentLink);

    /* ============================================================
       ✅ SAVE NEW DEPOSIT AS PENDING
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
    });

    await deposit.save();

    // 📨 In-app notification
    await Notification.create({
      user: userId,
      type: "deposit",
      message: `🆕 Deposit of $${amount} created under ${plan} plan.`,
    });

    return res.status(201).json({
      msg: "New deposit created successfully.",
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

/*/* ============================================================
   ✅ UPDATE DEPOSIT STATUS (Approve / Reject)
============================================================ */
export const updateDepositStatus = async (req, res) => {
  try {
    const { depositId } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(depositId)) {
      return res.status(400).json({ msg: "Invalid deposit ID" });
    }

    // ✅ Populate only required user fields (important for email)
    const deposit = await Deposit.findById(depositId).populate("user", "firstName lastName email referredBy balance wallets");
    if (!deposit) return res.status(404).json({ msg: "Deposit not found" });

    if (deposit.status === status) {
      return res.json({ msg: `Deposit already ${status}` });
    }

    deposit.status = status;
    await deposit.save();

    const user = deposit.user;

    // ============================================================
    // ✅ HANDLE APPROVED DEPOSIT
    // ============================================================
    if (status === "approved") {
      const method = deposit.method || "btc";

      if (!user.wallets) user.wallets = {};
      user.balance = (user.balance || 0) + Number(deposit.amount);
      user.wallets[method] = (user.wallets[method] || 0) + Number(deposit.amount);
      await user.save();

      // ✅ In-App Notification
      await Notification.create({
        user: user._id,
        type: "deposit",
        message: `✅ Your ${method.toUpperCase()} deposit of $${deposit.amount} under ${deposit.plan} plan has been approved.`,
      });

      // ✅ Send Email Notification
      if (user.email) {
        try {
          await sendEmail({
            to: user.email,
            subject: "Deposit Approved ✅",
            html: `
              <div style="font-family:Arial,sans-serif;padding:10px">
                <h3>Hello ${user.firstName || "Investor"},</h3>
                <p>Your deposit of <strong>$${deposit.amount}</strong> under the <strong>${deposit.plan}</strong> plan has been <strong>approved</strong> and credited to your account.</p>
                <p>You can now view it on your dashboard.</p>
                <br>
                <p>Best regards,<br><strong>Emuntra Investment Team</strong></p>
              </div>
            `,
          });
          console.log(`📧 Deposit approval email sent to ${user.email}`);
        } catch (emailErr) {
          console.error("❌ Email send error:", emailErr.message);
        }
      }

      // ✅ Referral commission (unchanged)
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
              message: `🎉 You earned $${commission.toFixed(2)} from ${user.firstName}'s deposit!`,
            });

            console.log(`💰 Referral commission of $${commission.toFixed(2)} sent to ${referrer.email}`);
          }
        } catch (refErr) {
          console.error("⚠️ Referral error during approval:", refErr.message);
        }
      }
    }

    // ============================================================
    // ✅ HANDLE REJECTED DEPOSIT
    // ============================================================
    if (status === "rejected") {
      await Notification.create({
        user: user._id,
        type: "deposit",
        message: `❌ Your deposit of $${deposit.amount} under ${deposit.plan} plan was rejected.`,
      });

      // ✅ Send rejection email too
      if (user.email) {
        try {
          await sendEmail({
            to: user.email,
            subject: "Deposit Rejected ❌",
            html: `
              <div style="font-family:Arial,sans-serif;padding:10px">
                <h3>Hello ${user.firstName || "Investor"},</h3>
                <p>We regret to inform you that your deposit of <strong>$${deposit.amount}</strong> under the <strong>${deposit.plan}</strong> plan was <strong>rejected</strong>.</p>
                <p>Please contact support for more details.</p>
                <br>
                <p>Best regards,<br><strong>Emuntra Investment Team</strong></p>
              </div>
            `,
          });
          console.log(`📧 Deposit rejection email sent to ${user.email}`);
        } catch (emailErr) {
          console.error("❌ Email send error (rejection):", emailErr.message);
        }
      }
    }

    // ============================================================
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
    const deposits = await Deposit.find({ user: userId }).sort({ createdAt: -1 });
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
