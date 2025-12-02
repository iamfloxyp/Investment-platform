// controllers/kycController.js
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
      return res
        .status(400)
        .json({ message: "SSN and driver license number are required" });
    }

    // HERE IS THE REAL FIX
    if (!req.files || !req.files.frontImage || !req.files.backImage) {
      return res.status(400).json({
        message: "Please upload front and back images"
      });
    }

    let frontFile = req.files.frontImage;
    let backFile = req.files.backImage;

    if (Array.isArray(frontFile)) frontFile = frontFile[0];
    if (Array.isArray(backFile)) backFile = backFile[0];

    const frontPath = path.join("uploads", "kyc", frontFile.name);
    const backPath = path.join("uploads", "kyc", backFile.name);

    await frontFile.mv(frontPath);
    await backFile.mv(backPath);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        kycStatus: "pending",
        kycMessage: "Your KYC has been submitted",
        "kyc.idFrontUrl": frontPath,
        "kyc.idBackUrl": backPath,
        "kyc.ssnText": ssn,
        "kyc.driverLicenseNumber": driverLicenseNumber
      },
      { new: true }
    );

    return res.json({
      success: true,
      message: "KYC submitted successfully",
      user: updatedUser
    });
  } catch (err) {
    console.error("KYC submit error:", err);
    return res.status(500).json({
      message: "Submission failed"
    });
  }
};