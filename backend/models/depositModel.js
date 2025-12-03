// models/depositModel.js
import mongoose from "mongoose";

const depositSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    plan: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Diamond", "Platinum"],
      required: true,
    },

    method: {
      type: String,
      enum: [
        "bank",
        "crypto",
        "btc",
        "eth",
        "usdt",
        "ltc",
        "xrp",
        "bnb",
        "doge",
        "trx",
        "bch",
        "sol",
        "ada",
        "usdc",
        "paypal",
        "paypal_manual",
      ],
      default: "crypto",
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },

    type: {
      type: String,
      enum: ["deposit", "withdraw"],
      default: "deposit",
    },

    note: {
      type: String,
      default: "",
    },

    // 🌟 REQUIRED FOR NOWPAYMENTS
    invoiceId: {
      type: String,
      default: null,
    },
 
    // Track if referral already paid
    referralPaid: {
      type: Boolean,
      default: false,
    },

    // When user becomes eligible for next daily profit
    profitEligibleAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Deposit = mongoose.model("Deposit", depositSchema);
export default Deposit;