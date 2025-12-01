// controllers/kycController.js
import User from "../models/userModel.js";
import cloudinary from "cloudinary";

// USER SUBMITS KYC
export const submitKYC = async (req, res) => {
  try {
    const userId = req.user.id;

    const { ssn, driverLicenseNumber } = req.body;

    if (!ssn || !driverLicenseNumber) {
      return res.status(400).json({ message: "SSN and License Number required" });
    }

    if (!req.files || !req.files.licenseFront || !req.files.licenseBack) {
      return res.status(400).json({ message: "Upload front and back of the license" });
    }

    // Upload images to Cloudinary
    const front = await cloudinary.v2.uploader.upload(
      req.files.licenseFront.tempFilePath,
      { folder: "emuntra_kyc" }
    );

    const back = await cloudinary.v2.uploader.upload(
      req.files.licenseBack.tempFilePath,
      { folder: "emuntra_kyc" }
    );

    // Update User KYC section
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        kycStatus: "pending",
        kycMessage: "Your KYC has been submitted.",
        "kyc.idFrontUrl": front.secure_url,
        "kyc.idBackUrl": back.secure_url,
        "kyc.ssnText": ssn,
        "kyc.driverLicenseNumber": driverLicenseNumber,
      },
      { new: true }
    );

    return res.json({
      success: true,
      message: "KYC submitted successfully.",
      user: updatedUser,
    });

  } catch (err) {
    console.error("KYC submit error:", err);
    res.status(500).json({ message: "Server error submitting KYC" });
  }
};