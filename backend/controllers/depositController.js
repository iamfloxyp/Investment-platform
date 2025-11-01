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
       ✅ CHECK EXISTING PLAN DEPOSIT (top-ups)
    ============================================================ */
    const existingDeposit = await Deposit.findOne({ user: userId, plan });

    if (existingDeposit) {
      console.log("⚡ Existing deposit found. Creating new payment for additional amount...");

      try {
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

        let paymentLink = paymentResponse?.data?.invoice_url || "";
        if (!paymentLink?.startsWith("https://")) paymentLink = paymentLink.replace(/^http:\/\//, "https://");
        if (!paymentLink.includes("nowpayments.io")) {
          const id = paymentResponse?.data?.invoice_id;
          paymentLink = id ? `https://nowpayments.io/payment?iid=${id}` : "";
        }

        // ✅ Track the top-up as a new pending deposit
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
       ✅ CREATE PAYMENT LINK FOR NEW PLAN
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

    let paymentLink = paymentResponse?.data?.invoice_url || "";
    if (!paymentLink?.startsWith("https://")) paymentLink = paymentLink.replace(/^http:\/\//, "https://");
    if (!paymentLink.includes("nowpayments.io")) {
      const id = paymentResponse?.data?.invoice_id;
      paymentLink = id ? `https://nowpayments.io/payment?iid=${id}` : "";
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
export const getAllDeposits = async (_req, res) => {
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
   - No instant profit.
   - One-time referral bonus (idempotent with flags).
============================================================ */
export const updateDepositStatus = async (req, res) => {
  try {
    const { depositId } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(depositId)) {
      return res.status(400).json({ msg: "Invalid deposit ID" });
    }

    // Load deposit + user (include referral fields)
    const deposit = await Deposit.findById(depositId).populate(
      "user",
      "firstName lastName email referredBy balance wallets referralEarnings referralBonusPaid"
    );
    if (!deposit) return res.status(404).json({ msg: "Deposit not found" });

    if (deposit.status === status) {
      return res.json({ msg: `Deposit already ${status}` });
    }

    // 🔐 Compute “first approved deposit” BEFORE we flip the status,
    // and only if we’ve never paid referral for this user.
    const user = deposit.user;
    const hadAnyApprovedBefore = await Deposit.countDocuments({
      user: user._id,
      status: "approved",
      type: "deposit",
    });

    // Apply new status
    deposit.status = status;
    await deposit.save();

    /* ============================================================
       ✅ HANDLE APPROVED DEPOSIT (NO INSTANT PROFIT)
    ============================================================ */
    if (status === "approved") {
      const method = deposit.method || "btc";
      if (!user.wallets) user.wallets = {};

      // ✅ Reflect cash-in balances only (no profit here)
      user.balance        = (user.balance || 0) + Number(deposit.amount);
      user.wallets[method]= (user.wallets[method] || 0) + Number(deposit.amount);
      user.activeDeposit  = (user.activeDeposit || 0) + Number(deposit.amount);
      user.totalDeposits  = (user.totalDeposits || 0) + Number(deposit.amount);

      // Guard profit fields (never change here)
      user.earnedTotal = user.earnedTotal || 0;
      user.dailyProfit = user.dailyProfit || 0;

      // ✅ Set next profit eligibility time — 24h from now
  deposit.profitEligibleAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await user.save();

      // 🔔 Notify user
      await Notification.create({
        user: user._id,
        type: "deposit",
        message: `✅ Your ${method.toUpperCase()} deposit of $${deposit.amount} under ${deposit.plan} plan has been approved.`,
      });

      // 📧 Email
      if (user.email) {
        try {
          await sendEmail({
            to: user.email,
            subject: "Deposit Approved ✅",
            html: `
              <div style="font-family:Arial,sans-serif;padding:10px">
                <h3>Hello ${user.firstName || "Investor"},</h3>
                <p>Your deposit of <strong>$${deposit.amount}</strong> under the <strong>${deposit.plan}</strong> plan has been <strong>approved</strong>.</p>
                <p>Your profits will begin accumulating with the next daily profit cycle.</p>
                <br>
                <p>Best regards,<br><strong>Emuntra Investment Team</strong></p>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error("❌ Email send error:", emailErr.message);
        }
      }

      /* ============================================================
         ✅ REFERRAL BONUS — PAY ONLY ON FIRST APPROVED DEPOSIT
         Idempotent via `user.referralBonusPaid` + `deposit.referralPaid`
      ============================================================ */
      try {
        // Only if this user was referred, and we have not paid before
        if (
          user.referredBy &&
          mongoose.isValidObjectId(user.referredBy) &&
          user.referralBonusPaid !== true && // user flag
          deposit.referralPaid !== true       // deposit flag
        ) {
          // This is first approval if NO approved deposits existed before this one
          const isFirstApproved = hadAnyApprovedBefore === 0;

          if (isFirstApproved) {
            const referrer = await User.findById(user.referredBy);
            if (referrer) {
              const commissionRate = 0.07;
              const commission = Number(deposit.amount) * commissionRate;

              referrer.referralEarnings = (referrer.referralEarnings || 0) + commission;
              referrer.balance = (referrer.balance || 0) + commission;
              await referrer.save();

              // Mark flags to prevent double payment
              user.referralBonusPaid = true;
              await user.save();
              deposit.referralPaid = true;
              await deposit.save();

              await Notification.create({
                user: referrer._id,
                type: "referral",
                message: `🎉 You earned $${commission.toFixed(2)} from ${user.firstName}'s first deposit!`,
              });

              console.log(
                `💰 Referral commission of $${commission.toFixed(2)} sent to ${referrer.email} for ${user.email}'s first approved deposit`
              );
            }
          } else {
            console.log(`ℹ️ Skipping referral commission for ${user.email} (not first approved deposit)`);
          }
        }
      } catch (refErr) {
        console.error("⚠️ Referral error during approval:", refErr.message);
      }
    }

    /* ============================================================
       ✅ HANDLE REJECTED DEPOSIT
    ============================================================ */
    if (status === "rejected") {
      await Notification.create({
        user: user._id,
        type: "deposit",
        message: `❌ Your deposit of $${deposit.amount} under ${deposit.plan} plan was rejected.`,
      });

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
              </div>
            `,
          });
        } catch (emailErr) {
          console.error("❌ Email send error:", emailErr.message);
        }
      }
    }

    // Done
    return res.json({ msg: `Deposit ${status} successfully`, deposit });
  } catch (err) {
    console.error("❌ updateDepositStatus error:", err.message);
    return res.status(500).json({ msg: "Server error updating deposit" });
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