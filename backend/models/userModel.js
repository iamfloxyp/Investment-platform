// backend/models/userModel.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },
    // KYC status and message
kycStatus: {
  type: String,
  enum: ["not_submitted", "pending", "verified", "rejected"],
  default: "not_submitted",
},
kycMessage: {
  type: String,
  default: "",
},

// KYC data: images and SSN code
kyc: {
  idFrontUrl: { type: String, default: "" },   // License or ID front
  idBackUrl: { type: String, default: "" },    // License or ID back
  ssnImageUrl: { type: String, default: "" },  // SSN supporting doc upload
  ssnText: { type: String, default: "" },      // The actual SSN typed by user
  selfieUrl: { type: String, default: "" },    // Selfie holding the ID
},

    // ✅ Referral system fields
  referralCode: { type: String, unique: true },
  referredBy: { type: String, default: null },
  referralEarnings: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },


    // 🟢 Total account balance (USD equivalent)
    balance: { type: Number, default: 0 },

    // 🪙 Individual crypto wallet balances
    wallets: {
      btc: { type: Number, default: 0 },
      usdt: { type: Number, default: 0 },
      eth: { type: Number, default: 0 },
      bnb: { type: Number, default: 0 },
      bch: { type: Number, default: 0 },
      tron: { type: Number, default: 0 },
      ltc: { type: Number, default: 0 },
      xrp: { type: Number, default: 0 },
      doge: { type: Number, default: 0 },
    },
    // ✅ Wallet addresses for each crypto
  walletAddresses: {
    btc: { type: String, default: "" },
    eth: { type: String, default: "" },
    usdt: { type: String, default: "" },
    bnb: { type: String, default: "" },
    tron: { type: String, default: "" },
    bch: { type: String, default: "" },
    ltc: { type: String, default: "" },
    xrp: { type: String, default: "" },
    doge: { type: String, default: "" },
  },
  eactiveDeposit: {
  type: Number,
  default: 0,
},
totalDeposits: {
  type: Number,
  default: 0,
},
earnedTotal: {
  type: Number,
  default: 0,
},
dailyProfit: {
  type: Number,
  default: 0,
},
lastProfitDate: {
  type: String, // store date like "2025-10-29"
  default: "",
},


    // 📨 Email verification fields
    verifyCodeHash: { type: String, select: false },
    verifyCodeExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// 🧩 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔐 Compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;