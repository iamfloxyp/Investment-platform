// models/depositModel.js
import mongoose from "mongoose";

const depositSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  amount: { type: Number, required: true },

  plan: {
    type: String,
    enum: ["Bronze", "Silver", "Gold", "Diamond", "Platinum"],
    required: true,
  },

  method: { type: String, default: "crypto" },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "completed"],
    default: "pending",
  },

  type: { type: String, enum: ["deposit", "withdraw"], default: "deposit" },

  note: { type: String, default: "" },

  // IMPORTANT FOR BLOCKBEE
  paymentAddress: { type: String, default: null },
  txid: { type: String, default: null },
  paidAmount: { type: Number, default: 0 },
  coin: { type: String, default: null },

  referralPaid: { type: Boolean, default: false },

  profitEligibleAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model("Deposit", depositSchema);