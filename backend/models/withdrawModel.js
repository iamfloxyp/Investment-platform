import mongoose from "mongoose";

const withdrawSchema = new mongoose.Schema(
  {
    // ✅ Support both user and userId for backward compatibility
  
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    processor: { type: String, required: true }, // btc, eth, etc
    amount: { type: Number, required: true },
    walletAddress: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Withdrawal", withdrawSchema, "withdrawals");