// models/depositModel.js
import mongoose from "mongoose";

const depositSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // links to userModel
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      enum: ["bank", "crypto", ],
      default: "bank",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    type: {
      type: String,
      enum: ["deposit", "withdraw"],
      default: "deposit", required:false
    },
    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Deposit = mongoose.model("Deposit", depositSchema);
export default Deposit;