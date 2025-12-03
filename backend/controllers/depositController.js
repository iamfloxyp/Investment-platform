// controllers/depositController.js
import mongoose from "mongoose";
import axios from "axios";
import Deposit from "../models/depositModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { sendEmail } from "../utils/sendEmail.js";

/* ============================================================
   CREATE DEPOSIT (USER + ADMIN)
============================================================ */
console.log(">>> addDepositForUser triggered");
console.log("BODY:", req.body);
export const addDepositForUser = async (req, res) => {
  try {
    let { userId, amount, method, plan, note, status } = req.body;

    amount = Number(amount);
    if (!amount || amount <= 0)
      return res.status(400).json({ msg: "Invalid amount" });

    // Normalize plan
    if (plan) {
      plan = plan.replace(/plan/i, "").trim().toLowerCase();
      const allowed = ["bronze", "silver", "gold", "diamond", "platinum"];
      if (!allowed.includes(plan))
        return res.status(400).json({ msg: `Invalid plan: ${plan}` });

      plan = plan.charAt(0).toUpperCase() + plan.slice(1);
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    method = (method || "btc").toLowerCase();

    /* ============================================================
       PAYPAL MANUAL PAYMENT (NO API)
    ============================================================ */
    if (method === "paypal" || method === "paypal_manual") {
      const deposit = new Deposit({
        user: userId,
        amount,
        method: "paypal_manual",
        plan,
        note: note || "User selected PayPal FNF. Pending admin approval.",
        status: "pending",
        type: "deposit",
      });

      await deposit.save();

      await Notification.create({
        user: userId,
        type: "deposit",
        message: `Your PayPal deposit of $${amount} is awaiting admin approval.`,
      });

      return res.status(201).json({
        msg: "PayPal deposit created successfully",
        deposit,
      });
    }

    /* ============================================================
       CRYPTO VIA NOWPAYMENTS
    ============================================================ */

    // Create local pending deposit
    const deposit = new Deposit({
      user: userId,
      amount,
      method,
      plan,
      note,
      status: status || "pending",
      type: "deposit",
      invoiceId: null,
    });

    await deposit.save();

    const payload = {
      price_amount: amount,
      price_currency: "usd",
      pay_currency: method,
      order_id: String(deposit._id),
      ipn_callback_url: `${process.env.BACKEND_URL}/api/nowpayments/webhook`,
    };

    let invoiceResponse;
    console.log(">>> Creating NOWPayments invoice...");
console.log("Payload:", payload);

    try {
      invoiceResponse = await axios.post(
        "https://api.nowpayments.io/v1/invoice",
        payload,
        {
          headers: {
            "x-api-key": process.env.NOWPAYMENTS_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err) {
      console.error("NOWPayments error:", err?.response?.data || err.message);
      return res.status(500).json({
        msg: "Error connecting to payment server",
        
      });
    }

    const invoiceData = invoiceResponse.data;

    const paymentUrl = invoiceData.payment_url || "";
    const invoiceId = invoiceData.payment_id || "";

    if (!paymentUrl) {
      return res.status(500).json({
        msg: "Could not generate payment link",
      });
    }

    deposit.invoiceId = invoiceId;
    await deposit.save();

    await Notification.create({
      user: userId,
      type: "deposit",
      message: `Deposit of $${amount} created. Complete your crypto payment.`,
    });

    return res.status(201).json({
      msg: "Crypto deposit created successfully",
      deposit,
      paymentLink: paymentUrl,
    });
  } catch (err) {
    console.error("addDepositForUser error:", err.message);
    return res.status(500).json({
      msg: "Server error creating deposit",
    });
  }
};

/* ============================================================
   GET ALL DEPOSITS (ADMIN)
============================================================ */
export const getAllDeposits = async (_req, res) => {
  try {
    const deposits = await Deposit.find()
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json(deposits);
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
};

/* ============================================================
   UPDATE DEPOSIT STATUS (ADMIN)
============================================================ */
export const updateDepositStatus = async (req, res) => {
  try {
    const { depositId } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(depositId))
      return res.status(400).json({ msg: "Invalid deposit ID" });

    const deposit = await Deposit.findById(depositId).populate("user");
    if (!deposit) return res.status(404).json({ msg: "Deposit not found" });

    if (deposit.status === status)
      return res.json({ msg: `Deposit already ${status}` });

    deposit.status = status;
    await deposit.save();

    const user = deposit.user;

    if (status === "approved") {
      user.balance = (user.balance || 0) + deposit.amount;
      user.totalDeposits = (user.totalDeposits || 0) + deposit.amount;
      user.activeDeposit = (user.activeDeposit || 0) + deposit.amount;
      await user.save();

      await Notification.create({
        user: user._id,
        type: "deposit",
        message: `Your deposit of $${deposit.amount} has been approved.`,
      });
    }

    if (status === "rejected") {
      await Notification.create({
        user: user._id,
        type: "deposit",
        message: `Your deposit of $${deposit.amount} has been rejected.`,
      });
    }

    res.json({ msg: `Deposit ${status}`, deposit });
  } catch (err) {
    res.status(500).json({ msg: "Server error updating deposit" });
  }
};

/* ============================================================
   USER VIEW THEIR DEPOSITS
============================================================ */
export const getUserDeposits = async (req, res) => {
  try {
    const { userId } = req.params;

    const deposits = await Deposit.find({ user: userId }).sort({
      createdAt: -1,
    });

    res.json(deposits);
  } catch {
    res.status(500).json({ msg: "Server error fetching deposits" });
  }
};

/* ============================================================
   DELETE DEPOSIT (ADMIN)
============================================================ */
export const deleteDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;

    const deleted = await Deposit.findByIdAndDelete(depositId);

    if (!deleted)
      return res.status(404).json({ msg: "Deposit not found" });

    res.json({ msg: "Deposit deleted successfully" });
  } catch {
    res.status(500).json({ msg: "Server error deleting deposit" });
  }
};