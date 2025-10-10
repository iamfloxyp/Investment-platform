import mongoose from "mongoose";

const adminSettingsSchema = new mongoose.Schema(
  {
    profile: {
      name: String,
      email: String,
      password: String, // you may later hash it if you enable real password update
    },
    system: {
      brandName: String,
      currency: { type: String, default: "USD" },
    },
    security: {
      enable2FA: { type: Boolean, default: false },
    },
    transactions: {
      minLimit: Number,
      maxLimit: Number,
      withdrawApproval: { type: String, enum: ["yes", "no"], default: "no" },
    },
  },
  { timestamps: true }
);

const AdminSettings = mongoose.model("AdminSettings", adminSettingsSchema);
export default AdminSettings;