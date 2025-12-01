import User from "../models/userModel.js";
import path from "path";

export const submitKYC = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId = req.user.id;
    const { ssn, driverLicenseNumber } = req.body;

    if (!ssn || !driverLicenseNumber) {
      return res.status(400).json({ message: "SSN and license number required" });
    }

    if (!req.files || !req.files["licenseFront"] || !req.files["licenseBack"]) {
      return res.status(400).json({ message: "Upload both front and back images" });
    }

    // File paths saved by multer
    const frontImage = req.files["licenseFront"][0].filename;
    const backImage = req.files["licenseBack"][0].filename;

    const updated = await User.findByIdAndUpdate(
      userId,
      {
        kycStatus: "pending",
        kycMessage: "Your KYC has been submitted and is under review.",
        "kyc.idFrontUrl": `/uploads/kyc/${frontImage}`,
        "kyc.idBackUrl": `/uploads/kyc/${backImage}`,
        "kyc.ssnText": ssn,
        "kyc.driverLicenseNumber": driverLicenseNumber
      },
      { new: true }
    );

    return res.json({
      success: true,
      message: "KYC submitted successfully.",
      user: updated,
    });

  } catch (err) {
    console.error("KYC submit error:", err);
    return res.status(500).json({ message: "Server error submitting KYC" });
  }
};