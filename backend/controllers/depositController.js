// controllers/depositController.js
import mongoose from "mongoose";
import axios from "axios";
import Deposit from "../models/depositModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { sendEmail } from "../utils/sendEmail.js";

/* ============================================================
   🔑 BlockBee config
============================================================ */
const BLOCKBEE_API_KEY = process.env.BLOCKBEE_API_KEY;
const BLOCKBEE_BASE = "https://api.blockbee.io";

// For now we will use USD as base fiat currency for amount
const DEFAULT_FIAT = "usd";

/**
 * Small helper to build a BlockBee payment URL from response
 */
function buildBlockBeePaymentUrl(chain, address, params = {}) {
  const url = new URL(`${BLOCKBEE_BASE}/payment/${chain}/${address}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.append(k, String(v));
    }
  });
  return url.toString();
}

/* ============================================================
   ✅ ADMIN CREATES DEPOSIT FOR USER  (BlockBee + PayPal + existing logic)
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

    // Make sure method is lowercase coin symbol like "btc", "eth", "usdttrc20", etc
    method = (method || "btc").toLowerCase();

    /* ============================================================
       🟨 HANDLE PAYPAL MANUAL PAYMENT (no API)
    ============================================================ */
    if (method === "paypal_manual" || method === "paypal") {
      const deposit = new Deposit({
        user: userId,
        amount,
        method: "paypal_manual",
        plan,
        note:
          note ||
          "User selected PayPal Friends and Family. Pending admin confirmation.",
        status: "pending",
        type: "deposit",
      });

      await deposit.save();

      await Notification.create({
        user: userId,
        type: "deposit",
        message: `🟡 Your PayPal deposit of $${amount} is awaiting admin confirmation.`,
      });

      return res.status(201).json({
        msg: "PayPal deposit created successfully",
        deposit,
      });
    }

    /* ============================================================
       🟦 CRYPTO DEPOSIT VIA BLOCKBEE
       We no longer call NowPayments here.
       1. Create a Deposit with status "pending"
       2. Call BlockBee to build a payment link
       3. Store deposit reference, return paymentUrl to frontend
    ============================================================ */

    // 1) Create local deposit first, in pending state
    const depositStatus = status || "pending";
    const deposit = new Deposit({
      user: userId,
      amount,
      method, // coin symbol like "btc"
      plan,
      note,
      status: depositStatus,
      type: "deposit",
      // invoiceId will be used for BlockBee reference if you want
      invoiceId: null,
    });

    await deposit.save();

    // 2) Build BlockBee payment link
    // You set per-coin receiving addresses on BlockBee dashboard,
    // so here we only call their "create payment" endpoint.
    let paymentUrl = "";
    let blockbeeInvoiceId = "";

    try {
      // BlockBee simple payment creation
      // Docs: https://docs.blockbee.io/
      const callbackUrl = `${process.env.BLOCKBEE_CALLBACK_BASE_URL || "https://api.emuntra.com"}/api/payments/blockbee/webhook`;

      const payload = {
        api_key: BLOCKBEE_API_KEY,
        callback_url: callbackUrl,
        value: amount,
        fiat: currency || DEFAULT_FIAT,
        order_id: String(deposit._id),
        email: user.email,
      };

      // Example endpoint:
      //   POST https://api.blockbee.io/api/v1/${method}/create_payment
      const createUrl = `${BLOCKBEE_BASE}/api/v1/${method}/create_payment`;

      console.log("📡 Calling BlockBee:", createUrl, payload);

      const bbRes = await axios.post(createUrl, payload, {
        headers: { "Content-Type": "application/json" },
      });

      const bbData = bbRes.data || {};

      // BlockBee returns payment info in bbData, adjust depending on their actual response
      // Typical fields:
      //  - bbData.payment_uri or bbData.redirect_url
      //  - bbData.invoice_id / payment_id
      paymentUrl =
        bbData.payment_uri ||
        bbData.redirect_url ||
        "";

      blockbeeInvoiceId =
        bbData.invoice_id ||
        bbData.payment_id ||
        "";

      if (!paymentUrl) {
        console.warn("⚠️ BlockBee did not return payment URL clearly:", bbData);
      }
    } catch (bbErr) {
      console.error("❌ BlockBee error:", bbErr?.response?.data || bbErr.message);
      return res
        .status(500)
        .json({ msg: "Error connecting to crypto payment server" });
    }

    // 3) Save BlockBee invoice id if present
    if (blockbeeInvoiceId) {
      deposit.invoiceId = blockbeeInvoiceId;
      await deposit.save();
    }

    await Notification.create({
      user: userId,
      type: "deposit",
      message: `🆕 Deposit of $${amount} created under ${plan} plan. Please complete your crypto payment.`,
    });

    return res.status(201).json({
      msg: "New crypto deposit created successfully.",
      deposit,
      paymentLink: paymentUrl,
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
    // and only if we have never paid referral for this user.
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
      user.balance = (user.balance || 0) + Number(deposit.amount);
      user.wallets[method] =
        (user.wallets[method] || 0) + Number(deposit.amount);
      user.activeDeposit =
        (user.activeDeposit || 0) + Number(deposit.amount);
      user.totalDeposits =
        (user.totalDeposits || 0) + Number(deposit.amount);

      // Guard profit fields (never change here)
      user.earnedTotal = user.earnedTotal || 0;
      user.dailyProfit = user.dailyProfit || 0;

      // ✅ Set next profit eligibility time — 24h from now
      deposit.profitEligibleAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      );

      await user.save();
      await deposit.save();

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
          deposit.referralPaid !== true // deposit flag
        ) {
          // This is first approval if NO approved deposits existed before this one
          const isFirstApproved = hadAnyApprovedBefore === 0;

          if (isFirstApproved) {
            const referrer = await User.findById(user.referredBy);
            if (referrer) {
              const commissionRate = 0.07;
              const commission = Number(deposit.amount) * commissionRate;

              referrer.referralEarnings =
                (referrer.referralEarnings || 0) + commission;
              referrer.balance =
                (referrer.balance || 0) + commission;
              await referrer.save();

              // Mark flags to prevent double payment
              user.referralBonusPaid = true;
              await user.save();
              deposit.referralPaid = true;
              await deposit.save();

              await Notification.create({
                user: referrer._id,
                type: "referral",
                message: `🎉 You earned $${commission.toFixed(
                  2
                )} from ${user.firstName}'s first deposit!`,
              });

              console.log(
                `💰 Referral commission of $${commission.toFixed(
                  2
                )} sent to ${referrer.email} for ${user.email}'s first approved deposit`
              );
            }
          } else {
            console.log(
              `ℹ️ Skipping referral commission for ${user.email} (not first approved deposit)`
            );
          }
        }
      } catch (refErr) {
        console.error(
          "⚠️ Referral error during approval:",
          refErr.message
        );
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