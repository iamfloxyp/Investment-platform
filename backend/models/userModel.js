const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true, minlength: 6 },

  referralCode: { type: String },
  referredBy:   { type: String, default: null },
  kycStatus:    { type: String, enum: ["none","pending","verified","rejected"], default: "none" },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);