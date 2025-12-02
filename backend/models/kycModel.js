import mongoose from "mongoose";

const kycSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    ssn: { type: String, required: true },
    driverLicenseNumber: { type: String, required: true },

    // Cloudinary URLs
    licenseFrontUrl: { type: String, required: true },
    licenseBackUrl: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    adminNote: { type: String, default: "" },
  },
  { timestamps: true }
);

const KYC = mongoose.model("KYC", kycSchema);
export default KYC;